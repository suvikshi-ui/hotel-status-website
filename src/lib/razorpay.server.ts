import { createHmac, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { BOOKING_SELECT, type BookingRow } from "@/lib/bookings.server";
import { onPaymentRecorded } from "@/lib/booking-events.server";

const SITE = "https://www.hotelstatusresidency.com";

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
  if (row.status !== "pending_payment" || row.payment_status !== "unpaid" || row.payment_url) return row;
  if (!Number.isInteger(row.amount_due_now) || row.amount_due_now <= 0) return row;
  const creds = keys();
  if (!creds) return row;

  const origin = (process.env.SITE_URL || process.env.BETTER_AUTH_URL || SITE).replace(/\/$/, "");
  const body: Record<string, unknown> = {
    amount: row.amount_due_now * 100,
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
    notes: { booking_id: row.id, payment_mode: row.payment_mode },
  };
  if (row.hold_expires_at) {
    // Razorpay needs expire_by at least 15 minutes ahead.
    const expire = Math.floor(new Date(row.hold_expires_at).getTime() / 1000);
    if (expire > Date.now() / 1000 + 16 * 60) body.expire_by = expire;
  }
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
  if (row.payment_status !== "unpaid" || !row.payment_link_id) return row;
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
    if (payload.amount_paid !== row.amount_due_now * 100) return row;
    const paymentId = payload.payments?.find((item) => item.status === "captured")?.payment_id ?? null;
    return (await recordPayment(row.id, row.amount_due_now, paymentId)) ?? row;
  } catch {
    return row;
  }
}

/** Record an online payment; confirms a pending booking. Null if already recorded. */
export async function recordPayment(id: string, amountRupees: number, paymentId: string | null): Promise<BookingRow | null> {
  const row = await returningRow(`select ${BOOKING_SELECT} from record_payment($1, $2, $3)`, [id, amountRupees, paymentId]);
  // Only the first record of a payment notifies (replays return null).
  if (row) await onPaymentRecorded(row);
  return row;
}

/** Webhook path: only accept the exact amount the link asked for. */
export async function recordPaymentIfAmount(
  id: string,
  amountPaise: number,
  paymentId: string | null,
): Promise<BookingRow | null> {
  const sql = await getSql();
  const rows = await sql.query<{ amount_due_now: number }>(`select amount_due_now from bookings where id = $1`, [id]);
  if (!rows[0] || rows[0].amount_due_now * 100 !== amountPaise) return null;
  return recordPayment(id, rows[0].amount_due_now, paymentId);
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

/** Refund (part of) a captured payment. Amount in rupees. Null when keys are missing or Razorpay refuses. */
export async function refundPayment(
  paymentId: string,
  amountRupees: number,
  bookingId: string,
): Promise<{ id: string; status: string } | null> {
  const creds = keys();
  if (!creds || !paymentId || amountRupees <= 0) return null;
  try {
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: "POST",
      headers: { Authorization: authHeader(creds.keyId, creds.keySecret), "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(amountRupees * 100),
        speed: "normal",
        receipt: `refund-${bookingId}`.slice(0, 40),
        notes: { booking_id: bookingId },
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { id?: string; status?: string };
    return data.id ? { id: data.id, status: data.status ?? "pending" } : null;
  } catch {
    return null;
  }
}
