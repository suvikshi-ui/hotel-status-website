import { createHmac, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { BOOKING_SELECT, type BookingRow } from "@/lib/bookings.server";

const SITE = "https://hotel-status-website.vercel.app";

const ROOM_NAMES: Record<string, string> = {
  deluxe: "Deluxe",
  "super-deluxe": "Super Deluxe",
  suite: "Suite",
};

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

function keys(): { keyId: string; keySecret: string } | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

function authHeader(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function returningRow(text: string, params: unknown[]): Promise<BookingRow | null> {
  const sql = await getSql();
  const rows = await sql.query<BookingRow>(text, params);
  return rows[0] ?? null;
}

export async function attachPaymentLink(row: BookingRow): Promise<BookingRow> {
  if (row.status !== "confirmed" || row.payment_status === "paid" || row.payment_url) return row;
  if (!Number.isInteger(row.total_amount) || row.total_amount <= 0) return row;
  const creds = keys();
  if (!creds) return row;

  const origin = (process.env.BETTER_AUTH_URL || SITE).replace(/\/$/, "");
  const body: Record<string, unknown> = {
    amount: row.total_amount * 100,
    currency: "INR",
    accept_partial: false,
    description: `Hotel Status Residency · ${row.id} · ${ROOM_NAMES[row.room_type] ?? "Stay"}`,
    reference_id: row.id,
    customer: {
      name: row.guest_name,
      contact: row.phone.length === 10 ? `+91${row.phone}` : row.phone,
      email: row.email,
    },
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: { booking_id: row.id },
  };
  if (origin.startsWith("https://")) {
    body.callback_url = `${origin}/api/razorpay/callback`;
    body.callback_method = "get";
  }

  try {
    const response = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: authHeader(creds.keyId, creds.keySecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) return row;
    const payload = (await response.json()) as { id?: string; short_url?: string };
    if (!payload.id || !payload.short_url?.startsWith("https://")) return row;
    return (
      (await returningRow(
        `update bookings set payment_url = $2, payment_link_id = $3 where id = $1 returning ${BOOKING_SELECT}`,
        [row.id, payload.short_url, payload.id],
      )) ?? row
    );
  } catch {
    return row;
  }
}

export async function syncPaymentStatus(row: BookingRow): Promise<BookingRow> {
  if (row.payment_status === "paid" || !row.payment_link_id) return row;
  const creds = keys();
  if (!creds) return row;
  try {
    const response = await fetch(
      `https://api.razorpay.com/v1/payment_links/${encodeURIComponent(row.payment_link_id)}`,
      { headers: { Authorization: authHeader(creds.keyId, creds.keySecret) } },
    );
    if (!response.ok) return row;
    const payload = (await response.json()) as {
      status?: string;
      amount_paid?: number;
      payments?: { payment_id?: string; status?: string }[];
    };
    if (payload.status !== "paid") return row;
    if (payload.amount_paid !== undefined && payload.amount_paid !== row.total_amount * 100) return row;
    const paymentId = payload.payments?.find((item) => item.status === "captured")?.payment_id ?? null;
    return (await markPaid(row.id, paymentId)) ?? row;
  } catch {
    return row;
  }
}

export async function markPaid(id: string, paymentId: string | null): Promise<BookingRow | null> {
  return returningRow(
    `update bookings
     set payment_status = 'paid', payment_id = coalesce($2, payment_id)
     where id = $1
     returning ${BOOKING_SELECT}`,
    [id, paymentId],
  );
}

export async function markPaidIfAmount(
  id: string,
  amountPaise: number,
  paymentId: string | null,
): Promise<BookingRow | null> {
  const sql = await getSql();
  const rows = await sql.query<{ total_amount: number }>(`select total_amount from bookings where id = $1`, [id]);
  if (!rows[0] || rows[0].total_amount * 100 !== amountPaise) return null;
  return markPaid(id, paymentId);
}

export function paymentLinkSignature(input: {
  linkId: string;
  referenceId: string;
  status: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret || !input.signature) return false;
  const payload = `${input.linkId}|${input.referenceId}|${input.status}|${input.paymentId}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  return safeEqual(expected, input.signature);
}

export function webhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET)?.trim();
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export async function cancelRemotePaymentLink(linkId: string | null): Promise<void> {
  if (!linkId) return;
  const creds = keys();
  if (!creds) return;
  try {
    await fetch(`https://api.razorpay.com/v1/payment_links/${encodeURIComponent(linkId)}/cancel`, {
      method: "POST",
      headers: { Authorization: authHeader(creds.keyId, creds.keySecret) },
    });
  } catch {
    // The stay is still cancelled locally if Razorpay is unreachable.
  }
}
