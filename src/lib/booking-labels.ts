import type { BookingRow } from "@/lib/bookings.server";

const STATUS: Record<BookingRow["status"], string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  expired: "Expired (unpaid)",
};

const PAYMENT: Record<BookingRow["payment_status"], string> = {
  unpaid: "Unpaid",
  partial: "Advance paid",
  paid: "Paid",
  pay_at_hotel: "Pay at hotel",
  refunded: "Refunded",
  partially_refunded: "Part refunded",
};

export function statusLabel(row: Pick<BookingRow, "status" | "payment_status">): string {
  if (row.status === "cancelled" || row.status === "expired") return STATUS[row.status];
  return `${STATUS[row.status]} · ${PAYMENT[row.payment_status]}`;
}

export function paymentLabel(status: BookingRow["payment_status"]): string {
  return PAYMENT[status];
}
