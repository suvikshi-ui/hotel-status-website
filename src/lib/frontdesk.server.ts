import type { BookingRow } from "@/lib/bookings.server";

/**
 * Pushes website bookings into the Status Ledger (front desk app) Supabase
 * project, table public.website_bookings (migration
 * supabase/migrations/0018_website_bookings.sql in hotel-status-residency).
 *
 * Server-only. Needs FRONTDESK_SUPABASE_URL and FRONTDESK_SUPABASE_SERVICE_KEY;
 * without them this is a no-op. Upserts by booking id, so later payment or
 * cancellation updates replace the earlier row.
 */
export function frontDeskConfigured(): boolean {
  return Boolean(process.env.FRONTDESK_SUPABASE_URL?.trim() && process.env.FRONTDESK_SUPABASE_SERVICE_KEY?.trim());
}

export function frontDeskRecord(row: BookingRow) {
  return {
    id: row.id,
    guest_name: row.guest_name,
    phone: row.phone,
    email: row.email,
    room_type: row.room_type,
    rooms: row.rooms,
    guests: row.guests,
    check_in: row.check_in,
    check_out: row.check_out,
    total_amount: row.total_amount,
    amount_paid: row.amount_paid,
    balance: Math.max(0, row.total_amount - row.amount_paid),
    status: row.status,
    payment_status: row.payment_status,
    payment_mode: row.payment_mode,
    booked_at: row.created_at,
    synced_at: new Date().toISOString(),
  };
}

export async function pushToFrontDesk(row: BookingRow): Promise<boolean> {
  const url = process.env.FRONTDESK_SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.FRONTDESK_SUPABASE_SERVICE_KEY?.trim();
  if (!url || !key) return false;
  // Unpaid online holds stay on the website until confirmed.
  if (row.status === "pending_payment" || row.status === "expired") return false;
  try {
    const response = await fetch(`${url}/rest/v1/website_bookings?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(frontDeskRecord(row)),
    });
    return response.ok;
  } catch {
    return false;
  }
}
