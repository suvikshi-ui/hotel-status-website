import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  cancelBookingForPhone,
  cancelBookingRow,
  collectBalanceRow,
  findBookingRow,
  insertBooking,
  listBookingRows,
  listTakenStays,
  roomsLeft,
  type RoomsLeft,
  type BookingRow,
  type TakenStay,
} from "@/lib/bookings.server";
import { assertOwner } from "@/lib/owner.server";
import { amountDueNow, bookingConfig } from "@/lib/booking-config.server";
import {
  attachPaymentLink,
  cancelRemotePaymentLink,
  razorpayConfigured,
  syncPaymentStatus,
} from "@/lib/razorpay.server";
import { notifyOwnerOfBooking } from "@/lib/owner-notify.server";

export type { BookingRow, RoomsLeft, TakenStay };
import { HOTEL } from "@/lib/hotels";
import { nightsBetween } from "@/lib/format";

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
  paymentMode: z.enum(["full", "advance", "pay_at_hotel"]).default("full"),
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

const datesInput = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type BookingOptions = { advancePercent: number; payAtHotel: boolean; holdMinutes: number };

export const bookingOptions = createServerFn({ method: "GET" }).handler(async (): Promise<BookingOptions> => {
  const config = bookingConfig();
  return { advancePercent: config.advancePercent, payAtHotel: config.payAtHotel, holdMinutes: config.holdMinutes };
});

export const checkRoomsLeft = createServerFn({ method: "POST" })
  .validator(datesInput)
  .handler(async ({ data }): Promise<RoomsLeft> => {
    await noStore();
    if (data.checkOut <= data.checkIn) return {};
    return roomsLeft(data.checkIn, data.checkOut);
  });

/** The server prices the stay; the browser total is only a preview. */
export function stayTotal(roomType: string, checkIn: string, checkOut: string, rooms: number): number {
  const room = HOTEL.rooms.find((item) => item.id === roomType);
  if (!room) throw new Error("Unknown room type.");
  return room.price * rooms * nightsBetween(checkIn, checkOut);
}

export const createBooking = createServerFn({ method: "POST" })
  .validator(bookingInput)
  .handler(async ({ data }): Promise<BookingRow> => {
    await noStore();
    if (data.checkOut <= data.checkIn) {
      throw new Error("Check-out must be after check-in.");
    }
    const config = bookingConfig();
    if (data.paymentMode === "pay_at_hotel" && !config.payAtHotel) {
      throw new Error("Pay at hotel is not available. Choose an online payment.");
    }
    const totalAmount = stayTotal(data.roomType, data.checkIn, data.checkOut, data.rooms);
    const row = await insertBooking({
      ...data,
      totalAmount,
      phone: phoneDigits(data.phone),
      amountDueNow: amountDueNow(totalAmount, data.paymentMode, config.advancePercent),
      holdMinutes: config.holdMinutes,
    });
    const saved = await attachPaymentLink(row);
    try {
      await notifyOwnerOfBooking(saved);
    } catch {
      // The stay is already saved. A missed alert must not undo it.
    }
    return saved;
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
    if (row?.payment_status === "unpaid") await cancelRemotePaymentLink(row?.payment_link_id ?? null);
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
    if (row?.payment_status === "unpaid") await cancelRemotePaymentLink(row?.payment_link_id ?? null);
    return row;
  });

export const collectBalance = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().trim().min(1).max(40) }))
  .handler(async ({ context, data }): Promise<BookingRow | null> => {
    await noStore();
    await assertOwner(context.userId);
    return collectBalanceRow(data.id);
  });

export const paymentSetup = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ links: boolean }> => {
    await noStore();
    await assertOwner(context.userId);
    return { links: razorpayConfigured() };
  });
