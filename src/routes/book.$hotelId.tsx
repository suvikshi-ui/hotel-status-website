import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { addDays, format, parseISO } from "date-fns";
import { useEffect, useState, type FormEvent } from "react";
import { PageShell } from "@/components/site-chrome";
import { PayStay } from "@/components/pay-stay";
import { SendBooking } from "@/components/send-booking";
import { Button } from "@/components/ui/button";
import { useBookings, type Booking } from "@/lib/bookings";
import { listTakenDates, type TakenStay } from "@/lib/bookings.functions";
import { formatInr, formatLongDate, nightsBetween, todayIso, tomorrowIso } from "@/lib/format";
import { getHotel, HOTEL, type RoomType } from "@/lib/hotels";
import { openBookingSends } from "@/lib/booking-note";
import { cn } from "@/lib/utils";

const ROOM_IDS = ["deluxe", "super-deluxe", "suite"] as const;
type RoomId = (typeof ROOM_IDS)[number];

type BookSearch = {
  room?: RoomId;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
};

function isRoom(value: unknown): value is RoomId {
  return typeof value === "string" && (ROOM_IDS as readonly string[]).includes(value);
}

function isIso(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function asCount(value: unknown, min: number, max: number): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return undefined;
  return parsed;
}

function nextDay(iso: string): string {
  return format(addDays(parseISO(iso), 1), "yyyy-MM-dd");
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  if (raw.includes("already booked")) return "Those dates are already booked for this room type.";
  if (raw.includes("Check-out")) return "Check-out must be after check-in.";
  if (raw.trim()) return raw;
  return "Could not save the booking. Please try again.";
}

export const Route = createFileRoute("/book/$hotelId")({
  validateSearch: (search: Record<string, unknown>): BookSearch => ({
    room: isRoom(search.room) ? search.room : undefined,
    checkIn: isIso(search.checkIn) ? search.checkIn : undefined,
    checkOut: isIso(search.checkOut) ? search.checkOut : undefined,
    guests: asCount(search.guests, 1, 12),
    rooms: asCount(search.rooms, 1, 4),
  }),
  beforeLoad: ({ params }) => {
    if (!getHotel(params.hotelId)) throw notFound();
  },
  head: () => ({
    meta: [{ title: "Book a stay · Hotel Status Residency" }],
  }),
  component: BookPage,
});

const field =
  "h-11 w-full border-0 border-b border-ink/20 bg-transparent px-0 text-sm text-ink outline-none focus:border-ink";

function BookPage() {
  const search = Route.useSearch();
  const mine = useBookings((s) => s.bookings);
  const add = useBookings((s) => s.add);
  const [taken, setTaken] = useState<TakenStay[]>([]);

  const [roomId, setRoomId] = useState<RoomId>(search.room ?? "deluxe");
  const [checkIn, setCheckIn] = useState(search.checkIn ?? todayIso());
  const [checkOut, setCheckOut] = useState(search.checkOut ?? tomorrowIso());
  const [guests, setGuests] = useState(search.guests ?? 2);
  const [rooms, setRooms] = useState(search.rooms ?? 1);
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Booking | null>(null);

  useEffect(() => {
    let live = true;
    listTakenDates()
      .then((rows) => {
        if (live) setTaken(rows);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [done]);

  const room = HOTEL.rooms.find((item) => item.id === roomId) ?? HOTEL.rooms[0];
  const datesOk = checkOut > checkIn;
  const nights = datesOk ? nightsBetween(checkIn, checkOut) : 0;
  const total = nights * room.price * rooms;
  const clash =
    taken.find(
      (stay) => stay.room_type === room.id && stay.check_in < checkOut && stay.check_out > checkIn,
    ) ??
    mine.find(
      (booking) =>
        booking.status === "confirmed" &&
        booking.roomTypeId === room.id &&
        booking.checkIn < checkOut &&
        booking.checkOut > checkIn,
    );

  function onCheckIn(value: string) {
    setCheckIn(value);
    if (value && checkOut <= value) setCheckOut(nextDay(value));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const name = guestName.trim();
    const phoneDigits = normalizePhone(phone);
    const emailTrimmed = email.trim();
    if (name.length < 2) {
      setError("Enter the guest name.");
      return;
    }
    if (phoneDigits.length < 10) {
      setError("Enter a 10-digit phone number.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setError("Enter an email address.");
      return;
    }
    if (!datesOk) {
      setError("Check-out must be after check-in.");
      return;
    }
    if (guests > room.occupancy * rooms) {
      setError(`${room.name} sleeps ${room.occupancy} guests per room. Add a room, or choose another type.`);
      return;
    }
    setPending(true);
    try {
      const booking = await add({
        hotelId: HOTEL.id,
        roomTypeId: room.id,
        checkIn,
        checkOut,
        guests,
        rooms,
        guestName: name,
        phone: phoneDigits,
        email: emailTrimmed,
        notes: "",
        nights,
        subtotal: total,
        tax: 0,
        total,
      });
      openBookingSends({
        id: booking.id,
        guestName: booking.guestName,
        phone: booking.phone,
        email: booking.email,
        roomName: room.name,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        guests: booking.guests,
        rooms: booking.rooms,
        total: booking.total,
      });
      setDone(booking);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <PageShell>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs tracking-[0.22em] text-gold uppercase">Hotel Status Residency</p>
        <h1 className="mt-3 font-display text-5xl font-semibold">Book a stay</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
          Choose a room and the dates. You get a booking number, then pay that total on Razorpay.
        </p>

        {done ? (
          <Confirmed booking={done} onAnother={() => setDone(null)} />
        ) : (
          <form onSubmit={onSubmit} className="mt-10">
            <fieldset>
              <legend className="text-xs tracking-[0.18em] text-muted uppercase">Room</legend>
              <div className="mt-4 grid gap-3">
                {HOTEL.rooms.map((item) => (
                  <RoomChoice
                    key={item.id}
                    room={item}
                    selected={item.id === room.id}
                    onSelect={() => setRoomId(item.id as RoomId)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs tracking-[0.18em] text-muted uppercase">Check-in</span>
                <input
                  id="check-in"
                  type="date"
                  required
                  min={todayIso()}
                  className={field}
                  value={checkIn}
                  onChange={(event) => onCheckIn(event.target.value)}
                  suppressHydrationWarning
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs tracking-[0.18em] text-muted uppercase">Check-out</span>
                <input
                  id="check-out"
                  type="date"
                  required
                  min={checkIn ? nextDay(checkIn) : todayIso()}
                  className={field}
                  value={checkOut}
                  onChange={(event) => setCheckOut(event.target.value)}
                  suppressHydrationWarning
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs tracking-[0.18em] text-muted uppercase">Guests</span>
                <select
                  id="guests"
                  className={cn(field, "appearance-none")}
                  value={guests}
                  onChange={(event) => setGuests(Number(event.target.value))}
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs tracking-[0.18em] text-muted uppercase">Rooms</span>
                <select
                  id="rooms"
                  className={cn(field, "appearance-none")}
                  value={rooms}
                  onChange={(event) => setRooms(Number(event.target.value))}
                >
                  {[1, 2, 3, 4].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {clash ? (
              <p className="mt-4 text-sm text-terracotta">
                {room.name} is already booked{" "}
                {"checkIn" in clash
                  ? `${formatLongDate(clash.checkIn)} to ${formatLongDate(clash.checkOut)}`
                  : `${formatLongDate(clash.check_in)} to ${formatLongDate(clash.check_out)}`}
                . Pick other dates, or another room type.
              </p>
            ) : null}

            <div className="mt-8 grid gap-6">
              <label className="flex flex-col gap-1">
                <span className="text-xs tracking-[0.18em] text-muted uppercase">Guest name</span>
                <input
                  id="guest-name"
                  required
                  autoComplete="name"
                  maxLength={120}
                  className={field}
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs tracking-[0.18em] text-muted uppercase">Phone</span>
                <input
                  id="guest-phone"
                  type="tel"
                  inputMode="tel"
                  required
                  autoComplete="tel"
                  placeholder="90760 11515"
                  className={field}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs tracking-[0.18em] text-muted uppercase">Email</span>
                <input
                  id="guest-email"
                  type="email"
                  required
                  autoComplete="email"
                  className={field}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            </div>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-ink/10 pt-6">
              <div>
                <p className="text-xs tracking-[0.18em] text-muted uppercase">
                  {datesOk
                    ? `${nights} night${nights === 1 ? "" : "s"} · ${rooms} room${rooms === 1 ? "" : "s"}`
                    : "Choose your dates"}
                </p>
                <p className="font-display text-4xl font-semibold tabular-nums">
                  {datesOk ? formatInr(total) : "—"}
                </p>
              </div>
              <Button
                type="submit"
                variant="ink"
                disabled={pending || !datesOk}
                className="rounded-none tracking-[0.16em] uppercase"
              >
                {pending ? "Saving…" : "Confirm booking"}
              </Button>
            </div>
            {error && !error.includes("already booked") ? (
              <p className="mt-4 text-sm text-terracotta">{error}</p>
            ) : null}
          </form>
        )}
      </main>
    </PageShell>
  );
}

function RoomChoice({
  room,
  selected,
  onSelect,
}: {
  room: RoomType;
  selected: boolean;
  onSelect: () => void;
}) {
  const cover = room.photos[0];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-4 border p-3 text-left",
        selected ? "border-ink bg-cream" : "border-ink/15",
      )}
    >
      <img src={cover.src} alt="" className="size-16 shrink-0 object-cover" />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-2xl font-semibold">{room.name}</span>
        <span className="block text-sm text-muted">
          {room.size} · up to {room.occupancy} guests
        </span>
      </span>
      <span className="text-sm tabular-nums">{formatInr(room.price)}</span>
    </button>
  );
}

function Confirmed({ booking, onAnother }: { booking: Booking; onAnother: () => void }) {
  const room = HOTEL.rooms.find((item) => item.id === booking.roomTypeId);
  return (
    <div className="mt-10 border border-ink/15 bg-cream p-6">
      <p className="text-xs tracking-[0.18em] text-success uppercase">Confirmed</p>
      <h2 className="mt-2 font-display text-4xl font-semibold">{booking.id}</h2>
      <p className="mt-3 text-sm leading-relaxed">
        {room?.name ?? "Room"} · {booking.guestName}
        <br />
        {formatLongDate(booking.checkIn)} — {formatLongDate(booking.checkOut)} · {booking.nights} night
        {booking.nights === 1 ? "" : "s"} · {formatInr(booking.total)}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Keep this number. The hotel sees the same stay. Find it later with this number and the phone used here.
      </p>
      <PayStay status={booking.paymentStatus} url={booking.paymentUrl} amount={booking.total} />
      <SendBooking
        stay={{
          id: booking.id,
          guestName: booking.guestName,
          phone: booking.phone,
          email: booking.email,
          roomName: room?.name ?? "Room",
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          nights: booking.nights,
          guests: booking.guests,
          rooms: booking.rooms,
          total: booking.total,
        }}
      />
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="ink" className="rounded-none tracking-[0.16em] uppercase">
          <Link to="/bookings">Find this stay</Link>
        </Button>
        <Button type="button" variant="outline" className="rounded-none tracking-[0.16em] uppercase" onClick={onAnother}>
          Book another
        </Button>
      </div>
    </div>
  );
}
