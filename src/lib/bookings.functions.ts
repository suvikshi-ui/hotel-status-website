import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  cancelBookingForPhone,
  cancelBookingRow,
  findBookingRow,
  insertBooking,
  listBookingRows,
  listTakenStays,
  type BookingRow,
  type TakenStay,
} from "@/lib/bookings.server";
import { assertOwner } from "@/lib/owner.server";
import {
  attachPaymentLink,
  cancelRemotePaymentLink,
  razorpayConfigured,
  syncPaymentStatus,
} from "@/lib/razorpay.server";

export type { BookingRow, TakenStay };

const bookingInput = z.object({
  guestName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().max(160),
  roomType: z.enum(["deluxe", "super-deluxe", "suite"]),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(12),
  rooms: z.number().int().min(1).max(8),
  totalAmount: z.number().int().min(0).max(10_000_000),
});

const lookupInput = z.object({
  id: z.string().trim().min(1).max(40),
  phone: z.string().trim().min(7).max(20),
});

function noStore() {
  return import("@tanstack/react-start/server").then(({ setResponseHeader }) => {
    setResponseHeader("Cache-Control", "no-store");
  });
}

export function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export const listTakenDates = createServerFn({ method: "GET" }).handler(async (): Promise<TakenStay[]> => {
  await noStore();
  return listTakenStays();
});

export const createBooking = createServerFn({ method: "POST" })
  .validator(bookingInput)
  .handler(async ({ data }): Promise<BookingRow> => {
    await noStore();
    if (data.checkOut <= data.checkIn) {
      throw new Error("Check-out must be after check-in.");
    }
    const row = await insertBooking({ ...data, phone: phoneDigits(data.phone) });
    return attachPaymentLink(row);
  });

export const findBooking = createServerFn({ method: "POST" })
  .validator(lookupInput)
  .handler(async ({ data }): Promise<BookingRow | null> => {
    await noStore();
    return findBookingRow(data.id.trim().toUpperCase(), phoneDigits(data.phone));
  });

export const refreshPayment = createServerFn({ method: "POST" })
  .validator(lookupInput)
  .handler(async ({ data }): Promise<BookingRow | null> => {
    await noStore();
    const row = await findBookingRow(data.id.trim().toUpperCase(), phoneDigits(data.phone));
    if (!row) return null;
    return syncPaymentStatus(row);
  });

export const cancelGuestBooking = createServerFn({ method: "POST" })
  .validator(lookupInput)
  .handler(async ({ data }): Promise<BookingRow | null> => {
    await noStore();
    const row = await cancelBookingForPhone(data.id.trim().toUpperCase(), phoneDigits(data.phone));
    if (row?.payment_status !== "paid") await cancelRemotePaymentLink(row?.payment_link_id ?? null);
    return row;
  });

export const listOwnerBookings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BookingRow[]> => {
    await noStore();
    await assertOwner(context.userId);
    return listBookingRows();
  });

export const cancelOwnerBooking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().trim().min(1).max(40) }))
  .handler(async ({ context, data }): Promise<BookingRow | null> => {
    await noStore();
    await assertOwner(context.userId);
    const row = await cancelBookingRow(data.id);
    if (row?.payment_status !== "paid") await cancelRemotePaymentLink(row?.payment_link_id ?? null);
    return row;
  });

export const paymentSetup = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ links: boolean }> => {
    await noStore();
    await assertOwner(context.userId);
    return { links: razorpayConfigured() };
  });
