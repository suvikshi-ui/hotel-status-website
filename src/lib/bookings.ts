import { create } from "zustand";
import { cancelBooking, createBooking, listBookings, type BookingRow } from "@/lib/bookings.functions";
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
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (input: BookingInput) => Promise<Booking>;
  cancel: (id: string) => Promise<void>;
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
  loaded: false,
  error: null,
  load: async () => {
    try {
      const rows = await listBookings();
      set({ bookings: rows.map(rowToBooking), loaded: true, error: null });
    } catch (error) {
      set({
        loaded: true,
        error: error instanceof Error ? error.message : "Could not load bookings.",
      });
    }
  },
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
    set({ bookings: [booking, ...get().bookings.filter((item) => item.id !== booking.id)], error: null });
    return booking;
  },
  cancel: async (id) => {
    const row = await cancelBooking({ data: { id } });
    if (!row) {
      await get().load();
      return;
    }
    set({
      bookings: get().bookings.map((booking) =>
        booking.id === id ? { ...booking, status: "cancelled" } : booking,
      ),
    });
  },
}));
