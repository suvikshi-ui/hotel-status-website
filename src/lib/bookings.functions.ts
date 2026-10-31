import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  addDateBlock,
  collectBalanceRow,
  roomStatusFor,
  setStayStatus,
  type RoomStatus,
  deleteDateBlock,
  listDateBlocks,
  type DateBlock,
  findBookingById,
  findBookingByToken,
  findBookingRow,
  insertBooking,
  listBookingRows,
  listTakenStays,
  publicAvailability,
  publicRoomTypes,
  roomPrice,
  type PublicAvailability,
  type PublicRoomType,
  type RoomsLeft,
  type BookingRow,
  type TakenStay,
} from "@/lib/bookings.server";
import { ownerMiddleware } from "@/lib/owner-auth.functions";
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
import { attachReferral, referralAmounts, resolveReferral } from "@/lib/referrals.server";

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
  referralCode: z.string().trim().max(40).optional(),
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

export type { PublicAvailability, PublicRoomType };
export type AvailabilityLevel = PublicAvailability[string]["level"];

/** Public availability without room counts: available / few left / sold out. */
export const checkAvailability = createServerFn({ method: "POST" })
  .validator(datesInput.extend({ rooms: z.number().int().min(1).max(8).default(1) }))
  .handler(async ({ data }): Promise<PublicAvailability> => {
    await noStore();
    if (data.checkOut <= data.checkIn) return {};
    return publicAvailability(data.checkIn, data.checkOut, data.rooms);
  });

/** Room types guests can see and book, with the owner-set nightly price. */
export const listPublicRooms = createServerFn({ method: "GET" }).handler(async (): Promise<PublicRoomType[]> => {
  return publicRoomTypes();
});

/** Guest-side check of a referral code: only the guest discount is revealed. */
export const checkReferralCode = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().trim().min(1).max(40) }))
  .handler(async ({ data }): Promise<{ ok: true; code: string; guestPercent: number } | { ok: false; message: string }> => {
    await noStore();
    try {
      const ref = await resolveReferral(data.code);
      return { ok: true, code: ref.code, guestPercent: ref.guestPercent };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "That referral code is not valid." };
    }
  });

/** The server prices the stay from the owner-set price; the browser total is only a preview. */
async function stayTotal(roomType: string, checkIn: string, checkOut: string, rooms: number): Promise<number> {
  const room = await roomPrice(roomType);
  if (!room || !room.active) throw new Error("That room type is not available to book.");
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
    const listAmount = await stayTotal(data.roomType, data.checkIn, data.checkOut, data.rooms);
    const referral = data.referralCode ? await resolveReferral(data.referralCode) : null;
    const amounts = referral
      ? referralAmounts(listAmount, referral.guestPercent, referral.agentPercent)
      : { discount: 0, commission: 0, total: listAmount };
    const totalAmount = amounts.total;
    let dueNow = amountDueNow(totalAmount, data.paymentMode, config.advancePercent);
    // TEMP-TEST-AMOUNT: remove later — custom amount replaces the advance, validated against the server total
    if (data.customAmount !== undefined) {
      if (data.paymentMode !== "advance") throw new Error("Custom amount is only for online advance payments.");
      if (data.customAmount < 1 || data.customAmount > totalAmount) {
        throw new Error("Custom amount must be at least ₹1 and at most the booking total.");
      }
      dueNow = data.customAmount;
    }
    const { referralCode: _referralCode, ...withoutReferral } = data;
    const { customAmount: _customAmount, ...bookingData } = withoutReferral; // TEMP-TEST-AMOUNT: remove later
    let row = await insertBooking({
      ...bookingData,
      totalAmount,
      phone: phoneDigits(data.phone),
      amountDueNow: dueNow,
      holdMinutes: config.holdMinutes,
    });
    if (referral) {
      await attachReferral(row.id, referral, listAmount, amounts.discount, amounts.commission);
      row = (await findBookingById(row.id)) ?? row;
    }
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
  .middleware([ownerMiddleware])
  .handler(async (): Promise<BookingRow[]> => {
    await noStore();
    return listBookingRows();
  });

export const cancelOwnerBooking = createServerFn({ method: "POST" })
  .middleware([ownerMiddleware])
  .validator(z.object({ id: z.string().trim().min(1).max(40) }))
  .handler(async ({ data }): Promise<BookingRow | null> => {
    await noStore();
    return cancelWithRefund(await findBookingById(data.id), true);
  });

export const collectBalance = createServerFn({ method: "POST" })
  .middleware([ownerMiddleware])
  .validator(z.object({ id: z.string().trim().min(1).max(40) }))
  .handler(async ({ data }): Promise<BookingRow | null> => {
    await noStore();
    const row = await collectBalanceRow(data.id);
    await onBookingChanged(row);
    return row;
  });

export const paymentSetup = createServerFn({ method: "GET" })
  .middleware([ownerMiddleware])
  .handler(async (): Promise<{ links: boolean }> => {
    await noStore();
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
  .middleware([ownerMiddleware])
  .handler(async (): Promise<DateBlock[]> => {
    await noStore();
    return listDateBlocks();
  });

export const addBlock = createServerFn({ method: "POST" })
  .middleware([ownerMiddleware])
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
  .handler(async ({ data }): Promise<DateBlock[]> => {
    await noStore();
    await addDateBlock(data);
    return listDateBlocks();
  });

export const removeBlock = createServerFn({ method: "POST" })
  .middleware([ownerMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }): Promise<DateBlock[]> => {
    await noStore();
    await deleteDateBlock(data.id);
    return listDateBlocks();
  });

export type { RoomStatus };

/** Per room type: capacity, booked, blocked and free for one night. */
export const ownerRoomStatus = createServerFn({ method: "POST" })
  .middleware([ownerMiddleware])
  .validator(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(async ({ data }): Promise<RoomStatus[]> => {
    await noStore();
    return roomStatusFor(data.date);
  });

/** Confirmed -> checked in -> checked out. Validated in SQL. */
export const ownerStayStatus = createServerFn({ method: "POST" })
  .middleware([ownerMiddleware])
  .validator(z.object({ id: z.string().trim().min(1).max(40), to: z.enum(["checked_in", "checked_out"]) }))
  .handler(async ({ data }): Promise<BookingRow> => {
    await noStore();
    const row = await setStayStatus(data.id, data.to);
    if (!row) {
      throw new Error(
        data.to === "checked_in"
          ? "Only a confirmed booking that is not checked in yet can be checked in."
          : "Only a checked-in booking can be checked out.",
      );
    }
    await onBookingChanged(row);
    return row;
  });
