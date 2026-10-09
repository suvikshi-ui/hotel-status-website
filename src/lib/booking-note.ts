import { formatInr, formatLongDate } from "@/lib/format";
import { HOTEL } from "@/lib/hotels";

export type BookingNote = {
  id: string;
  guestName: string;
  phone: string;
  email: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  rooms: number;
  total: number;
};

export function bookingNote(stay: BookingNote): string {
  return [
    "Hotel Status Residency — booking confirmed",
    "",
    `Booking ID: ${stay.id}`,
    `Guest: ${stay.guestName}`,
    `Phone: ${stay.phone}`,
    `Email: ${stay.email}`,
    `Room: ${stay.roomName}`,
    `Check-in: ${formatLongDate(stay.checkIn)}`,
    `Check-out: ${formatLongDate(stay.checkOut)}`,
    `Nights: ${stay.nights}`,
    `Guests: ${stay.guests}`,
    `Rooms: ${stay.rooms}`,
    `Total: ${formatInr(stay.total)}`,
    "",
    `${HOTEL.name}, ${HOTEL.locality}, ${HOTEL.city}`,
    HOTEL.phones.join(" / "),
  ].join("\n");
}

function whatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export function whatsAppHref(phone: string, note: string): string {
  return `https://wa.me/${whatsAppPhone(phone)}?text=${encodeURIComponent(note)}`;
}

export function gmailHref(email: string, stayId: string, note: string): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: email,
    su: `Booking ${stayId} · Hotel Status Residency`,
    body: note,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function openBookingSends(stay: BookingNote): void {
  const note = bookingNote(stay);
  window.open(whatsAppHref(stay.phone, note), "_blank", "noopener,noreferrer");
  window.open(gmailHref(stay.email, stay.id, note), "_blank", "noopener,noreferrer");
}
