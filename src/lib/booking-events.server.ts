import type { BookingRow } from "@/lib/bookings.server";
import { notifyGuestOfBooking, notifyGuestOfPayment } from "@/lib/guest-notify.server";
import { pushToFrontDesk } from "@/lib/frontdesk.server";
import { notifyOwnerOfBooking, notifyOwnerOfPayment } from "@/lib/owner-notify.server";

async function quietly(jobs: Promise<unknown>[]): Promise<void> {
  // A failed message or sync must never undo a saved booking or payment.
  await Promise.allSettled(jobs);
}

export async function onBookingCreated(row: BookingRow): Promise<void> {
  await quietly([notifyOwnerOfBooking(row), notifyGuestOfBooking(row), pushToFrontDesk(row)]);
}

export async function onPaymentRecorded(row: BookingRow): Promise<void> {
  await quietly([notifyOwnerOfPayment(row), notifyGuestOfPayment(row), pushToFrontDesk(row)]);
}

/** Any other change (cancel, refund, desk payment): keep the front desk copy current. */
export async function onBookingChanged(row: BookingRow | null): Promise<void> {
  if (row) await quietly([pushToFrontDesk(row)]);
}
