import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { getCookie, getRequest, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { sendMail } from "@/lib/owner-notify.server";

export const OWNER_COOKIE = "hsr_owner";
const SESSION_DAYS = 14;
const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export class OwnerUnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Please sign in to the owner desk.");
    this.name = "OwnerUnauthorizedError";
  }
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function clientIp(): string {
  const h = getRequest()?.headers;
  const forwarded = h?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || h?.get("x-real-ip") || "").slice(0, 64);
}

function isSecure(): boolean {
  const url = getRequest()?.url ?? "";
  return url.startsWith("https://") || process.env.NODE_ENV === "production";
}

async function isOwnerEmail(email: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ email: string }>(`select email from owner_accounts where email = $1`, [email]);
  return rows.length > 0;
}

/** Sends a 6-digit code if the email is an owner account. Never reveals which. */
export async function sendOwnerCode(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const ip = clientIp();
  console.log("[otp] send requested", { ipPresent: Boolean(ip) });
  const sql = await getSql();
  // Per-IP limit applies to every address so the limit itself reveals nothing.
  if (ip) {
    const perIp = await sql.query<{ n: number }>(
      `select count(*)::int as n from owner_login_codes where ip = $1 and created_at > now() - interval '1 hour'`,
      [ip],
    );
    if (Number(perIp[0]?.n ?? 0) >= 10) {
      console.log("[otp] not sent: per-IP rate limit (10/hour)");
      return;
    }
  }
  if (!(await isOwnerEmail(email))) {
    console.log("[otp] not sent: email is not an owner account", { domain: email.split("@")[1] ?? "" });
    return;
  }
  const recent = await sql.query<{ last_min: number; last_hour: number }>(
    `select count(*) filter (where created_at > now() - interval '60 seconds')::int as last_min,
            count(*) filter (where created_at > now() - interval '1 hour')::int as last_hour
     from owner_login_codes where email = $1`,
    [email],
  );
  if (Number(recent[0]?.last_min ?? 0) >= 1 || Number(recent[0]?.last_hour ?? 0) >= 5) {
    console.log("[otp] not sent: per-email rate limit", { lastMinute: recent[0]?.last_min, lastHour: recent[0]?.last_hour });
    return;
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Older unused codes stop working once a new one is sent.
  await sql.query(`update owner_login_codes set used_at = now() where email = $1 and used_at is null`, [email]);
  await sql.query(
    `insert into owner_login_codes (email, code_hash, expires_at, ip) values ($1, $2, now() + interval '${CODE_MINUTES} minutes', $3)`,
    [email, sha256(`${email}:${code}`), ip],
  );
  console.log("[otp] code created, sending email", { email });
  try {
    await sendMail(
      email,
      `Owner desk sign-in code: ${code}`,
      `Your Hotel Status Residency owner desk sign-in code is ${code}.\n\nIt works once and expires in ${CODE_MINUTES} minutes. If you did not ask for it, ignore this email.`,
    );
  } catch (caught) {
    const e = (caught ?? {}) as { code?: string; responseCode?: number; response?: string; command?: string; message?: string };
    console.error("[otp] could not send code", { code: e.code, responseCode: e.responseCode, response: e.response, command: e.command, message: e.message });
  }
}

/** Checks the code; on success creates a session cookie. Returns false on any failure. */
export async function verifyOwnerCode(rawEmail: string, code: string): Promise<boolean> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^\d{6}$/.test(code)) return false;
  const sql = await getSql();
  const rows = await sql.query<{ id: number; code_hash: string; attempts: number }>(
    `select id::int as id, code_hash, attempts from owner_login_codes
     where email = $1 and used_at is null and expires_at > now()
     order by created_at desc limit 1`,
    [email],
  );
  const row = rows[0];
  if (!row || row.attempts >= MAX_ATTEMPTS) return false;
  if (!sameHash(row.code_hash, sha256(`${email}:${code}`))) {
    await sql.query(
      `update owner_login_codes set attempts = attempts + 1,
         used_at = case when attempts + 1 >= ${MAX_ATTEMPTS} then now() else used_at end
       where id = $1`,
      [row.id],
    );
    return false;
  }
  const claimed = await sql.query<{ id: number }>(
    `update owner_login_codes set used_at = now() where id = $1 and used_at is null returning id::int as id`,
    [row.id],
  );
  if (claimed.length === 0) return false;
  const token = randomBytes(32).toString("base64url");
  await sql.query(
    `insert into owner_sessions (token_hash, email, expires_at) values ($1, $2, now() + interval '${SESSION_DAYS} days')`,
    [sha256(token), email],
  );
  await sql.query(`delete from owner_sessions where expires_at < now()`);
  setCookie(OWNER_COOKIE, token, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return true;
}

/** The signed-in owner email, or null. */
export async function currentOwner(): Promise<string | null> {
  const token = getCookie(OWNER_COOKIE);
  if (!token || token.length > 100) return null;
  const sql = await getSql();
  const rows = await sql.query<{ email: string }>(
    `select s.email from owner_sessions s join owner_accounts a on a.email = s.email
     where s.token_hash = $1 and s.expires_at > now()`,
    [sha256(token)],
  );
  return rows[0]?.email ?? null;
}

export async function requireOwner(): Promise<string> {
  const email = await currentOwner();
  if (!email) throw new OwnerUnauthorizedError();
  return email;
}

export async function signOutOwner(): Promise<void> {
  const token = getCookie(OWNER_COOKIE);
  if (token) {
    const sql = await getSql();
    await sql.query(`delete from owner_sessions where token_hash = $1`, [sha256(token)]);
  }
  deleteCookie(OWNER_COOKIE, { path: "/" });
}
