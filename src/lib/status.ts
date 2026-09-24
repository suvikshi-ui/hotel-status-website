import { HOTELS, type Hotel } from "@/lib/hotels";
import { useBookings } from "@/lib/bookings";

export type StatusKind = "open" | "filling" | "last" | "full";

export type HotelStatus = {
  occupancy: number;
  roomsLeft: number;
  kind: StatusKind;
  label: string;
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function datesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function baseOccupancy(hotelId: string, checkIn: string): number {
  const hash = hashString(`${hotelId}|${checkIn}`);
  return 54 + (hash % 42);
}

export function roomsTakenLocally(hotelId: string, checkIn: string, checkOut: string): number {
  const bookings = useBookings.getState().bookings;
  return bookings
    .filter(
      (booking) =>
        booking.status === "confirmed" &&
        booking.hotelId === hotelId &&
        datesOverlap(booking.checkIn, booking.checkOut, checkIn, checkOut),
    )
    .reduce((sum, booking) => sum + booking.rooms, 0);
}

export function getHotelStatus(
  hotel: Hotel,
  checkIn: string,
  checkOut: string,
): HotelStatus {
  const occupancy = baseOccupancy(hotel.id, checkIn);
  const held = Math.round((occupancy / 100) * hotel.inventory);
  const local = roomsTakenLocally(hotel.id, checkIn, checkOut);
  const roomsLeft = Math.max(0, hotel.inventory - held - local);

  let kind: StatusKind = "open";
  if (roomsLeft === 0) kind = "full";
  else if (roomsLeft <= 4) kind = "last";
  else if (roomsLeft <= 12) kind = "filling";

  const label =
    kind === "full"
      ? "Full"
      : kind === "last"
        ? `${roomsLeft} left`
        : kind === "filling"
          ? "Filling"
          : "Open";

  return { occupancy: Math.min(100, occupancy), roomsLeft, kind, label };
}

export function citySnapshot(checkIn: string, checkOut: string) {
  const rows = HOTELS.map((hotel) => ({
    hotel,
    status: getHotelStatus(hotel, checkIn, checkOut),
  }));
  const open = rows.filter((row) => row.status.kind !== "full").length;
  const roomsLeft = rows.reduce((sum, row) => sum + row.status.roomsLeft, 0);
  const avgOccupancy = Math.round(
    rows.reduce((sum, row) => sum + row.status.occupancy, 0) / rows.length,
  );
  return { rows, open, roomsLeft, avgOccupancy };
}
