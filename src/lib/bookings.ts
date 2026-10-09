import { create } from "zustand";
import { createBooking, type BookingRow } from "@/lib/bookings.functions";
import { nightsBetween } from "@/lib/format";

export type Booking = {
  id: string;
  hotelId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  guestName: string;
  phone: string;
  email: string;
  notes: string;
  nights: number;
  subtotal: number;
  tax: number;
  total: number;
  status: "confirmed" | "cancelled";
  createdAt: string;
};

type BookingInput = Omit<Booking, "id" | "createdAt" | "status">;

type BookingState = {
  bookings: Booking[];
  add: (input: BookingInput) => Promise<Booking>;
};

export function rowToBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    hotelId: "residency",
    roomTypeId: row.room_type,
    checkIn: row.check_in,
    checkOut: row.check_out,
    guests: row.guests,
    rooms: row.rooms,
    guestName: row.guest_name,
    phone: row.phone,
    email: row.email,
    notes: "",
    nights: nightsBetween(row.check_in, row.check_out),
    subtotal: row.total_amount,
    tax: 0,
    total: row.total_amount,
    status: row.status,
    createdAt: row.created_at,
  };
}

export const useBookings = create<BookingState>()((set, get) => ({
  bookings: [],
  add: async (input) => {
    const row = await createBooking({
      data: {
        guestName: input.guestName,
        phone: input.phone,
        email: input.email,
        roomType: input.roomTypeId as "deluxe" | "super-deluxe" | "suite",
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        guests: input.guests,
        rooms: input.rooms,
        totalAmount: input.total,
      },
    });
    const booking = rowToBooking(row);
    set({ bookings: [booking, ...get().bookings.filter((item) => item.id !== booking.id)] });
    return booking;
  },
}));
