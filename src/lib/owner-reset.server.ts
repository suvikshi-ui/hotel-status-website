import { createHash, timingSafeEqual } from "node:crypto";
import { hashPassword } from "@better-auth/utils/password";
import { getSql } from "@/lib/db";
import { HOTEL } from "@/lib/hotels";

// SHA-256 of a one-time reset token. The token itself is not stored.
const RESET_TOKEN_SHA256 = "4a953c662bd6ff4015391bd8a7d74d92221656e6fdaaa1778a6eb6ca00dc4110";
const RESET_EXPIRES_AT = Date.parse("2026-10-10T07:30:00.000Z");

function tokenMatches(token: string): boolean {
  const hash = createHash("sha256").update(token).digest("hex");
  const left = Buffer.from(hash);
  const right = Buffer.from(RESET_TOKEN_SHA256);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function resetOwnerPassword(token: string, password: string): Promise<void> {
  if (Date.now() > RESET_EXPIRES_AT || !tokenMatches(token)) {
    throw new Error("This reset link is not valid anymore.");
  }
  if (password.length < 8 || password.length > 128) {
    throw new Error("Use at least 8 characters.");
  }

  const sql = await getSql();
  const marker = createHash("sha256").update(`used:${token}`).digest("hex");
  const seen = await sql.query<{ id: string }>(`select "id" from "verification" where "id" = $1`, [marker]);
  if (seen.length > 0) throw new Error("This reset link was already used.");

  const hashed = await hashPassword(password);
  const updated = await sql.query<{ userId: string }>(
    `update "account"
     set "password" = $1, "updatedAt" = now()
     where "providerId" = 'credential'
       and "userId" = (select "id" from "user" where lower("email") = lower($2))
     returning "userId"`,
    [hashed, HOTEL.email],
  );
  const userId = updated[0]?.userId;
  if (!userId) throw new Error("The owner account has no password to reset.");

  await sql.query(`delete from "session" where "userId" = $1`, [userId]);
  await sql.query(
    `insert into "verification" ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt")
     values ($1, 'owner-password-reset', 'used', now(), now(), now())`,
    [marker],
  );
}
