import { create } from "zustand";
import { persist } from "zustand/middleware";
import { bookingId } from "@/lib/format";

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
  add: (input: BookingInput) => Booking;
  cancel: (id: string) => void;
};

export const useBookings = create<BookingState>()(
  persist(
    (set, get) => ({
      bookings: [],
      add: (input) => {
        const booking: Booking = {
          ...input,
          id: bookingId(),
          createdAt: new Date().toISOString(),
          status: "confirmed",
        };
        set({ bookings: [booking, ...get().bookings] });
        return booking;
      },
      cancel: (id) =>
        set({
          bookings: get().bookings.map((booking) =>
            booking.id === id ? { ...booking, status: "cancelled" } : booking,
          ),
        }),
    }),
    { name: "hotel-status-residency-bookings", skipHydration: true },
  ),
);
