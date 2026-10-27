/** Booking rules the owner can tune with environment variables (see docs/BOOKING_FLOW.md). */
function num(key: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[key]?.trim());
  return Number.isFinite(raw) && raw >= min && raw <= max ? raw : fallback;
}

export type PaymentMode = "full" | "advance" | "pay_at_hotel";

export type BookingConfig = {
  advancePercent: number;
  holdMinutes: number;
  payAtHotel: boolean;
  fullRefundHours: number;
  gstPercent: number;
  pricesIncludeGst: boolean;
};

export function bookingConfig(): BookingConfig {
  return {
    advancePercent: num("ADVANCE_PERCENT", 30, 1, 100),
    holdMinutes: num("PAYMENT_HOLD_MINUTES", 30, 15, 24 * 60),
    payAtHotel: process.env.PAY_AT_HOTEL_ENABLED?.trim() !== "false",
    fullRefundHours: num("CANCEL_FULL_REFUND_HOURS", 24, 0, 24 * 60),
    gstPercent: num("GST_PERCENT", 5, 0, 28),
    pricesIncludeGst: process.env.PRICES_INCLUDE_GST?.trim() !== "false",
  };
}

export function amountDueNow(total: number, mode: PaymentMode, advancePercent: number): number {
  if (mode === "pay_at_hotel") return 0;
  if (mode === "advance") return Math.max(1, Math.ceil((total * advancePercent) / 100));
  return total;
}
