import { bookingConfig } from "@/lib/booking-config.server";
import { onBookingChanged } from "@/lib/booking-events.server";
import { markCancelled, recordRefund, type BookingRow } from "@/lib/bookings.server";
import { refundFor, type CancelPolicy } from "@/lib/cancel-policy";
import { HOTEL } from "@/lib/hotels";
import { sendMail } from "@/lib/owner-notify.server";
import { cancelRemotePaymentLink, refundPayment } from "@/lib/razorpay.server";

export function cancelPolicy(): CancelPolicy {
  const c = bookingConfig();
  return { fullRefundHours: c.fullRefundHours, lateRefundPercent: c.lateRefundPercent, checkInHour: c.checkInHour };
}

export function refundPreview(row: BookingRow): number {
  return refundFor(row, cancelPolicy(), Date.now());
}

/**
 * Cancel a live booking and refund what the policy allows through Razorpay.
 * `byHotel` (owner cancels) refunds everything paid online.
 */
export async function cancelWithRefund(row: BookingRow | null, byHotel = false): Promise<BookingRow | null> {
  if (!row || (row.status !== "confirmed" && row.status !== "pending_payment")) return null;
  const refund = byHotel
    ? row.payment_status === "pay_at_hotel"
      ? 0
      : row.amount_paid
    : refundPreview(row);
  let saved = await markCancelled(row.id, refund);
  if (!saved) return null;
  if (saved.payment_status === "unpaid") await cancelRemotePaymentLink(saved.payment_link_id);

  if (refund > 0) {
    const result = saved.payment_id ? await refundPayment(saved.payment_id, refund, saved.id) : null;
    saved =
      (await recordRefund(saved.id, result?.id ?? null, result ? (result.status === "processed" ? "processed" : "pending") : "failed")) ??
      saved;
    if (!result) {
      // Razorpay keys missing or refund refused: the owner must refund by hand.
      await sendMail(
        HOTEL.email,
        `Refund needed by hand: ${saved.id}`,
        `Booking ${saved.id} (${saved.guest_name}, ${saved.phone}) was cancelled. ₹${refund} is owed back but the Razorpay refund did not go through. Refund it from the Razorpay dashboard (payment ${saved.payment_id ?? "unknown"}).`,
      );
    }
  }

  await onBookingChanged(saved);
  await sendMail(
    saved.email,
    `Booking ${saved.id} cancelled · ${HOTEL.name}`,
    [
      `Dear ${saved.guest_name},`,
      "",
      `Your booking ${saved.id} (${saved.check_in} to ${saved.check_out}) has been cancelled.`,
      refund > 0
        ? `A refund of ₹${refund.toLocaleString("en-IN")} has been started to your original payment method. It usually arrives in 5 to 7 working days.`
        : "No refund is due under the cancellation policy.",
      "",
      `${HOTEL.name} · ${HOTEL.phones.join(" / ")}`,
    ].join("\n"),
  );
  return saved;
}
