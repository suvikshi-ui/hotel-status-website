import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cancelBookingRow, insertBooking, listBookingRows, type BookingRow } from "@/lib/bookings.server";

export type { BookingRow };

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

function noStore() {
  return import("@tanstack/react-start/server").then(({ setResponseHeader }) => {
    setResponseHeader("Cache-Control", "no-store");
  });
}

export const listBookings = createServerFn({ method: "GET" }).handler(async (): Promise<BookingRow[]> => {
  await noStore();
  return listBookingRows();
});

export const createBooking = createServerFn({ method: "POST" })
  .validator(bookingInput)
  .handler(async ({ data }): Promise<BookingRow> => {
    await noStore();
    if (data.checkOut <= data.checkIn) {
      throw new Error("Check-out must be after check-in.");
    }
    return insertBooking(data);
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().trim().min(1).max(40) }))
  .handler(async ({ data }): Promise<BookingRow | null> => {
    await noStore();
    return cancelBookingRow(data.id);
  });
