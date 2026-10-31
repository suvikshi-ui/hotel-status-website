import type { BookingRow } from "@/lib/bookings.server";
import { HOTEL } from "@/lib/hotels";
import { ROOM_NAMES, sendMail, sendWhatsAppTemplate } from "@/lib/owner-notify.server";

export function siteOrigin(): string {
  return (process.env.SITE_URL || process.env.BETTER_AUTH_URL || "https://www.hotelstatusresidency.com").replace(/\/$/, "");
}

function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function paymentLine(row: BookingRow): string {
  switch (row.payment_status) {
    case "pay_at_hotel":
      return `Pay ${rupees(row.total_amount)} at the hotel at check-in.`;
    case "partial":
      return `Advance paid: ${rupees(row.amount_paid)}. Balance at the hotel: ${rupees(row.total_amount - row.amount_paid)}.`;
    case "paid":
      return `Paid in full: ${rupees(row.amount_paid)}.`;
    default:
      return row.payment_url
        ? `Pay ${rupees(row.amount_due_now)} here to confirm: ${row.payment_url} (rooms are held for a short time).`
        : `Call ${HOTEL.phones[0]} to complete payment.`;
  }
}

export function manageLink(row: BookingRow): string {
  return `${siteOrigin()}/manage/${encodeURIComponent(row.id)}?t=${encodeURIComponent(row.manage_token)}`;
}

/** Price before discount and the referral discount, only when a code was used. */
function discountLines(row: BookingRow): string[] {
  if (!row.guest_discount_amount || row.guest_discount_amount <= 0) return [];
  const before = row.list_amount ?? row.total_amount + row.guest_discount_amount;
  return [
    `Price before discount: ${rupees(before)}`,
    `Referral discount${row.referral_code ? ` (${row.referral_code})` : ""}: −${rupees(row.guest_discount_amount)}`,
  ];
}

export function bookingText(row: BookingRow): string {
  const room = ROOM_NAMES[row.room_type] ?? row.room_type;
  return [
    `Dear ${row.guest_name},`,
    "",
    row.status === "confirmed"
      ? `Your stay at ${HOTEL.name} is confirmed.`
      : `We have received your booking at ${HOTEL.name}.`,
    `Booking number: ${row.id}`,
    `Room: ${room} × ${row.rooms}`,
    `Check-in: ${row.check_in} · Check-out: ${row.check_out}`,
    `Guests: ${row.guests}`,
    ...discountLines(row),
    `Total: ${rupees(row.total_amount)}`,
    paymentLine(row),
    "",
    `View or cancel your booking: ${manageLink(row)}`,
    `${HOTEL.address} · ${HOTEL.phones.join(" / ")}`,
  ].join("\n");
}

export function receiptText(row: BookingRow): string {
  return [
    `Dear ${row.guest_name},`,
    "",
    `Payment received for booking ${row.id} at ${HOTEL.name}. Thank you.`,
    ...discountLines(row),
    `Amount received: ${rupees(row.amount_paid)} of ${rupees(row.total_amount)}`,
    row.total_amount > row.amount_paid
      ? `Balance at the hotel: ${rupees(row.total_amount - row.amount_paid)}`
      : "Paid in full.",
    row.invoice_number ? `Tax invoice ${row.invoice_number}: ${siteOrigin()}/invoice/${row.id}?t=${row.manage_token}` : "",
    "",
    `Manage your booking: ${manageLink(row)}`,
  ]
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n");
}

/** Booking received / confirmed. Never throws. */
export async function notifyGuestOfBooking(row: BookingRow): Promise<void> {
  const room = ROOM_NAMES[row.room_type] ?? row.room_type;
  const text = bookingText(row);
  await Promise.allSettled([
    sendMail(row.email, `Your booking ${row.id} · ${HOTEL.name}`, text),
    sendWhatsAppTemplate(
      row.phone,
      process.env.WHATSAPP_GUEST_BOOKING_TEMPLATE?.trim() || "guest_booking_received",
      [row.guest_name, row.id, room, row.check_in, row.check_out, rupees(row.total_amount), paymentLine(row)],
      text,
    ),
  ]);
}

/** Payment receipt. Never throws. */
export async function notifyGuestOfPayment(row: BookingRow): Promise<void> {
  const text = receiptText(row);
  await Promise.allSettled([
    sendMail(row.email, `Payment receipt ${row.id} · ${HOTEL.name}`, text),
    sendWhatsAppTemplate(
      row.phone,
      process.env.WHATSAPP_GUEST_RECEIPT_TEMPLATE?.trim() || "guest_payment_receipt",
      [row.guest_name, row.id, rupees(row.amount_paid), rupees(Math.max(0, row.total_amount - row.amount_paid))],
      text,
    ),
  ]);
}
