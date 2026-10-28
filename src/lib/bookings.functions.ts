import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  addDateBlock,
  collectBalanceRow,
  deleteDateBlock,
  listDateBlocks,
  type DateBlock,
  findBookingById,
  findBookingByToken,
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
import { onBookingChanged, onBookingCreated } from "@/lib/booking-events.server";
import { cancelPolicy, cancelWithRefund, refundPreview } from "@/lib/cancellation.server";
import { policyText } from "@/lib/cancel-policy";
import { gstBreakdown, type GstBreakdown } from "@/lib/gst";

export type { BookingRow, DateBlock, RoomsLeft, TakenStay };
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
  // TEMP-TEST-AMOUNT: remove later — guest-chosen online payment (whole rupees, min ₹1)
  customAmount: z.number().int().min(1).max(10_000_000).optional(),
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
    let dueNow = amountDueNow(totalAmount, data.paymentMode, config.advancePercent);
    // TEMP-TEST-AMOUNT: remove later — custom amount replaces the advance, validated against the server total
    if (data.customAmount !== undefined) {
      if (data.paymentMode !== "advance") throw new Error("Custom amount is only for online advance payments.");
      if (data.customAmount < 1 || data.customAmount > totalAmount) {
        throw new Error("Custom amount must be at least ₹1 and at most the booking total.");
      }
      dueNow = data.customAmount;
    }
    const { customAmount: _customAmount, ...bookingData } = data; // TEMP-TEST-AMOUNT: remove later
    const row = await insertBooking({
      ...bookingData,
      totalAmount,
      phone: phoneDigits(data.phone),
      amountDueNow: dueNow,
      holdMinutes: config.holdMinutes,
    });
    const saved = await attachPaymentLink(row);
    await onBookingCreated(saved);
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
    const found = await findBookingRow(data.id.trim().toUpperCase(), phoneDigits(data.phone));
    return cancelWithRefund(found);
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
    return cancelWithRefund(await findBookingById(data.id), true);
  });

export const collectBalance = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().trim().min(1).max(40) }))
  .handler(async ({ context, data }): Promise<BookingRow | null> => {
    await noStore();
    await assertOwner(context.userId);
    const row = await collectBalanceRow(data.id);
    await onBookingChanged(row);
    return row;
  });

export const paymentSetup = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ links: boolean }> => {
    await noStore();
    await assertOwner(context.userId);
    return { links: razorpayConfigured() };
  });

const tokenInput = z.object({
  id: z.string().trim().min(1).max(40),
  token: z.string().trim().min(1).max(64),
});

export type ManageView = { row: BookingRow; refundIfCancelled: number; policy: string };

/** Guest self-service via the link in their confirmation (no phone needed). */
export const getManagedBooking = createServerFn({ method: "POST" })
  .validator(tokenInput)
  .handler(async ({ data }): Promise<ManageView | null> => {
    await noStore();
    const row = await findBookingByToken(data.id.toUpperCase(), data.token.toLowerCase());
    if (!row) return null;
    return { row, refundIfCancelled: refundPreview(row), policy: policyText(cancelPolicy()) };
  });

export const cancelManagedBooking = createServerFn({ method: "POST" })
  .validator(tokenInput)
  .handler(async ({ data }): Promise<BookingRow | null> => {
    await noStore();
    return cancelWithRefund(await findBookingByToken(data.id.toUpperCase(), data.token.toLowerCase()));
  });

export type InvoiceView = {
  row: BookingRow;
  gstin: string | null;
  nights: number;
  gst: GstBreakdown;
  hotel: { name: string; address: string; phones: string[]; email: string };
};

/** Printable GST invoice. Only for bookings that have an invoice number. */
export const getInvoice = createServerFn({ method: "POST" })
  .validator(tokenInput)
  .handler(async ({ data }): Promise<InvoiceView | null> => {
    await noStore();
    const row = await findBookingByToken(data.id.toUpperCase(), data.token.toLowerCase());
    if (!row?.invoice_number) return null;
    const c = bookingConfig();
    return {
      row,
      gstin: process.env.HOTEL_GSTIN?.trim() || "27ATAPP6184D2ZL",
      nights: nightsBetween(row.check_in, row.check_out),
      gst: gstBreakdown(row.total_amount, c.gstPercent, c.pricesIncludeGst),
      hotel: { name: HOTEL.name, address: HOTEL.address, phones: HOTEL.phones, email: HOTEL.email },
    };
  });

export const listBlocks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DateBlock[]> => {
    await noStore();
    await assertOwner(context.userId);
    return listDateBlocks();
  });

export const addBlock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z
      .object({
        room_type: z.enum(["deluxe", "super-deluxe", "suite"]),
        rooms: z.number().int().min(1).max(50),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        source: z.enum(["makemytrip", "fabhotels", "brevistay", "walk-in", "maintenance", "other"]),
        note: z.string().trim().max(200).default(""),
      })
      .refine((v) => v.end_date > v.start_date, { message: "End date must be after start date." }),
  )
  .handler(async ({ context, data }): Promise<DateBlock[]> => {
    await noStore();
    await assertOwner(context.userId);
    await addDateBlock(data);
    return listDateBlocks();
  });

export const removeBlock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<DateBlock[]> => {
    await noStore();
    await assertOwner(context.userId);
    await deleteDateBlock(data.id);
    return listDateBlocks();
  });
