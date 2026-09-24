import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function tomorrowIso(): string {
  return format(addDays(new Date(), 1), "yyyy-MM-dd");
}

export function formatShortDate(iso: string): string {
  return format(parseISO(iso), "d MMM");
}

export function formatLongDate(iso: string): string {
  return format(parseISO(iso), "d MMMM yyyy");
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const nights = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
  return Math.max(1, nights);
}

export function gstRate(nightly: number): number {
  return nightly < 7501 ? 0.12 : 0.18;
}

export function bookingId(): string {
  const n = Math.floor(Math.random() * 900000 + 100000);
  return `HSR-${n}`;
}
