import type { BookingRow } from "@/lib/bookings.server";
import { notifyGuestOfBooking, notifyGuestOfPayment } from "@/lib/guest-notify.server";
import { notifyOwnerOfBooking, notifyOwnerOfPayment } from "@/lib/owner-notify.server";

async function quietly(jobs: Promise<unknown>[]): Promise<void> {
  // A failed message or sync must never undo a saved booking or payment.
  await Promise.allSettled(jobs);
}

export async function onBookingCreated(row: BookingRow): Promise<void> {
  await quietly([notifyOwnerOfBooking(row), notifyGuestOfBooking(row)]);
}

export async function onPaymentRecorded(row: BookingRow): Promise<void> {
  await quietly([notifyOwnerOfPayment(row), notifyGuestOfPayment(row)]);
}
