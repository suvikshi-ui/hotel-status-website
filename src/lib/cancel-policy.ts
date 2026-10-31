/**
 * Cancellation policy (pure, no I/O, so it is easy to test).
 * Default: full refund when cancelled more than 24 hours before check-in,
 * otherwise none. Tunable with CANCEL_FULL_REFUND_HOURS,
 * CANCEL_LATE_REFUND_PERCENT and CHECKIN_HOUR (hotel local time, IST).
 */
export type CancelPolicy = {
  fullRefundHours: number;
  lateRefundPercent: number;
  checkInHour: number;
};

const IST_OFFSET_MINUTES = 330;

/** Check-in moment as a UTC timestamp (ms), for a yyyy-mm-dd date in IST. */
export function checkInMoment(checkIn: string, checkInHour: number): number {
  const [y, m, d] = checkIn.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!, checkInHour, 0) - IST_OFFSET_MINUTES * 60_000;
}

export function hoursBeforeCheckIn(checkIn: string, policy: CancelPolicy, now: number): number {
  return (checkInMoment(checkIn, policy.checkInHour) - now) / 3_600_000;
}

/** Rupees to refund out of what was actually paid online. */
export function refundFor(
  booking: { check_in: string; amount_paid: number; payment_status: string },
  policy: CancelPolicy,
  now: number,
): number {
  // Desk payments are refunded at the desk, not through Razorpay.
  if (booking.amount_paid <= 0 || booking.payment_status === "pay_at_hotel") return 0;
  if (hoursBeforeCheckIn(booking.check_in, policy, now) > policy.fullRefundHours) return booking.amount_paid;
  return Math.floor((booking.amount_paid * policy.lateRefundPercent) / 100);
}

export function policyText(policy: CancelPolicy): string {
  const late =
    policy.lateRefundPercent > 0
      ? `${policy.lateRefundPercent}% refund after that`
      : "no refund after that";
  return `Free cancellation up to ${policy.fullRefundHours} hours before check-in (${policy.checkInHour}:00 IST); ${late}.`;
}
