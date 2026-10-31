import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { addDays, format, parseISO } from "date-fns";
import { useEffect, useState, type FormEvent } from "react";
import { PageShell } from "@/components/site-chrome";
import { PayStay } from "@/components/pay-stay";
import { Button } from "@/components/ui/button";
import { useBookings, type Booking } from "@/lib/bookings";
import {
  bookingOptions,
  checkAvailability,
  checkReferralCode,
  listPublicRooms,
  type AvailabilityLevel,
  type BookingOptions,
  type PublicAvailability,
} from "@/lib/bookings.functions";
import { formatInr, formatLongDate, nightsBetween, todayIso, tomorrowIso } from "@/lib/format";
import { getHotel, HOTEL, type RoomType } from "@/lib/hotels";
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
  if (raw.includes("rooms of this type")) return "Not enough rooms of this type are free for those dates.";
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
  "h-11 w-full border-0 border-b border-[#c6a15a]/40 bg-transparent px-0 text-sm text-ink outline-none focus:border-[#8a6a2f]";
const kicker = "text-[0.7rem] tracking-[0.24em] text-[#8a6a2f] uppercase";

function BookPage() {
  const search = Route.useSearch();
  const add = useBookings((s) => s.add);
  const [avail, setAvail] = useState<PublicAvailability>({});
  const [prices, setPrices] = useState<Record<string, number> | null>(null);
  const [refInput, setRefInput] = useState("");
  const [referral, setReferral] = useState<{ code: string; guestPercent: number } | null>(null);
  const [refMessage, setRefMessage] = useState<string | null>(null);
  const [refChecking, setRefChecking] = useState(false);
  const [options, setOptions] = useState<BookingOptions>({ advancePercent: 30, payAtHotel: true, holdMinutes: 30 });
  // TEMP-TEST-AMOUNT: remove later — "custom" is a UI-only choice sent to the server as an advance with customAmount
  const [paymentMode, setPaymentMode] = useState<"full" | "advance" | "custom" | "pay_at_hotel">("full");
  const [customAmount, setCustomAmount] = useState("1"); // TEMP-TEST-AMOUNT: remove later

  useEffect(() => {
    listPublicRooms()
      .then((list) => setPrices(Object.fromEntries(list.map((item) => [item.id, item.price]))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bookingOptions()
      .then(setOptions)
      .catch(() => {});
  }, []);

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
    if (checkOut <= checkIn) return;
    checkAvailability({ data: { checkIn, checkOut, rooms } })
      .then((rows) => {
        if (live) setAvail(rows);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [done, checkIn, checkOut, rooms]);

  // Only the room types the owner shows on the website, at the owner-set price.
  const visibleRooms = HOTEL.rooms
    .filter((item) => (prices ? item.id in prices : item.id !== "super-deluxe"))
    .map((item) => ({ ...item, price: prices?.[item.id] ?? item.price }));
  const room = visibleRooms.find((item) => item.id === roomId) ?? visibleRooms[0];
  const datesOk = checkOut > checkIn;
  const nights = datesOk ? nightsBetween(checkIn, checkOut) : 0;
  const listTotal = nights * room.price * rooms;
  const discount = referral ? Math.floor((listTotal * referral.guestPercent) / 100) : 0;
  const total = listTotal - discount;
  const level = datesOk ? avail[room.id] : undefined;
  const clash = Boolean(level && !level.fits);

  async function applyReferral() {
    const code = refInput.trim();
    setRefMessage(null);
    if (!code) {
      setReferral(null);
      return;
    }
    setRefChecking(true);
    try {
      const res = await checkReferralCode({ data: { code } });
      if (res.ok) {
        setReferral({ code: res.code, guestPercent: res.guestPercent });
        setRefInput(res.code);
      } else {
        setReferral(null);
        setRefMessage(res.message);
      }
    } catch {
      setReferral(null);
      setRefMessage("Could not check that code. Please try again.");
    } finally {
      setRefChecking(false);
    }
  }

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
    // TEMP-TEST-AMOUNT: remove later
    const custom = Math.round(Number(customAmount));
    if (paymentMode === "custom" && (!Number.isFinite(custom) || custom < 1 || custom > total)) {
      setError(`Enter a custom amount between ₹1 and ${formatInr(total)}.`);
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
        referralCode: referral?.code,
        paymentMode: paymentMode === "custom" ? "advance" : paymentMode, // TEMP-TEST-AMOUNT: remove later
        customAmount: paymentMode === "custom" ? custom : undefined, // TEMP-TEST-AMOUNT: remove later
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
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
        <p className={kicker}>Hotel Status Residency</p>
        <h1 className="mt-3 font-display text-5xl font-medium sm:text-7xl">Book a stay</h1>
        <div className="mt-5 flex items-center gap-3">
          <span className="h-px w-16 bg-[#c6a15a]" />
          <span className="size-1.5 rotate-45 bg-[#c6a15a]" />
        </div>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
          Choose a room, the dates and how to pay: in full or an advance on Razorpay, or at the hotel.
        </p>

        {done ? (
          <Confirmed booking={done} onAnother={() => setDone(null)} />
        ) : (
          <form onSubmit={onSubmit} className="mt-10">
            <fieldset>
              <legend className={kicker}>Room</legend>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {visibleRooms.map((item) => (
                  <RoomChoice
                    key={item.id}
                    room={item}
                    level={datesOk ? avail[item.id]?.level : undefined}
                    selected={item.id === room.id}
                    onSelect={() => setRoomId(item.id as RoomId)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className={kicker}>Check-in</span>
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
                <span className={kicker}>Check-out</span>
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
                <span className={kicker}>Guests</span>
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
                <span className={kicker}>Rooms</span>
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
                {level?.level === "sold_out"
                  ? `${room.name} is sold out for those dates.`
                  : `Not enough ${room.name} rooms are free for those dates.`}{" "}
                Pick other dates, fewer rooms, or another room type.
              </p>
            ) : level ? (
              <p className="mt-4 text-sm">
                {room.name}, {formatLongDate(checkIn)} – {formatLongDate(checkOut)}: <AvailabilityBadge level={level.level} />
              </p>
            ) : null}

            <div className="mt-8">
              <span className={kicker}>Referral code, if you have one</span>
              <div className="mt-1 flex items-end gap-3">
                <input
                  id="referral-code"
                  maxLength={40}
                  autoComplete="off"
                  className={cn(field, "uppercase")}
                  value={refInput}
                  onChange={(event) => {
                    setRefInput(event.target.value.toUpperCase());
                    if (referral) setReferral(null);
                    setRefMessage(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void applyReferral();
                    }
                  }}
                />
                <Button type="button" variant="outline" disabled={refChecking || !refInput.trim()} onClick={applyReferral}>
                  {refChecking ? "Checking…" : "Apply"}
                </Button>
              </div>
              {referral ? (
                <p className="mt-2 text-sm text-success">
                  {referral.code} applied: {referral.guestPercent}% off the stay
                  {datesOk ? ` (−${formatInr(discount)})` : ""}.
                </p>
              ) : refMessage ? (
                <p className="mt-2 text-sm text-terracotta">{refMessage}</p>
              ) : null}
            </div>

            <div className="mt-8 grid gap-6">
              <label className="flex flex-col gap-1">
                <span className={kicker}>Guest name</span>
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
                <span className={kicker}>Phone</span>
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
                <span className={kicker}>Email</span>
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

            <fieldset className="mt-8">
              <legend className={kicker}>Payment</legend>
              <div className="mt-4 grid gap-2">
                {(
                  [
                    ["full", `Pay the full amount online${datesOk ? ` (${formatInr(total)})` : ""}`],
                    [
                      "advance",
                      `Pay ${options.advancePercent}% advance online${
                        datesOk ? ` (${formatInr(Math.ceil((total * options.advancePercent) / 100))})` : ""
                      }, the rest at the hotel`,
                    ],
                    // TEMP-TEST-AMOUNT: remove later
                    ["custom", "Custom amount online, the rest at the hotel"],
                    ...(options.payAtHotel ? [["pay_at_hotel", "Pay at the hotel at check-in"] as const] : []),
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={cn(
                      "flex items-center gap-3 border px-4 py-3 text-sm",
                      paymentMode === value ? "border-[#c6a15a] bg-[#12263d] text-[#f6f0e4]" : "border-[#c6a15a]/30",
                    )}
                  >
                    <input
                      type="radio"
                      name="payment-mode"
                      value={value}
                      checked={paymentMode === value}
                      onChange={() => setPaymentMode(value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              {/* TEMP-TEST-AMOUNT: remove later */}
              {paymentMode === "custom" ? (
                <label className="mt-4 flex max-w-xs flex-col gap-1">
                  <span className={kicker}>Amount to pay online (₹)</span>
                  <input
                    id="custom-amount"
                    type="number"
                    min={1}
                    max={total || undefined}
                    step={1}
                    inputMode="numeric"
                    className={field}
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                  />
                </label>
              ) : null}
              {paymentMode !== "pay_at_hotel" ? (
                <p className="mt-2 text-xs text-muted">
                  Rooms are held for {options.holdMinutes} minutes while you pay on Razorpay.
                </p>
              ) : null}
            </fieldset>

            <div className="mt-10 flex flex-wrap items-end justify-between gap-4 border-t border-[#c6a15a]/50 pt-6">
              <div>
                <p className={kicker}>
                  {datesOk
                    ? `${nights} night${nights === 1 ? "" : "s"} · ${rooms} room${rooms === 1 ? "" : "s"}`
                    : "Choose your dates"}
                </p>
                {datesOk && discount > 0 ? (
                  <p className="text-sm text-muted tabular-nums">
                    <s>{formatInr(listTotal)}</s> · referral discount −{formatInr(discount)}
                  </p>
                ) : null}
                <p className="font-display text-5xl font-medium text-[#8a6a2f] tabular-nums">
                  {datesOk ? formatInr(total) : "—"}
                </p>
              </div>
              <Button
                type="submit"
                variant="gold"
                disabled={pending || !datesOk || clash}
                className="rounded-none px-8 tracking-[0.18em] uppercase"
              >
                {pending ? "Saving…" : paymentMode === "pay_at_hotel" ? "Confirm booking" : "Book and pay"}
              </Button>
            </div>
            {error ? (
              <p className="mt-4 text-sm text-terracotta">{error}</p>
            ) : null}
          </form>
        )}
      </main>
    </PageShell>
  );
}

function AvailabilityBadge({ level }: { level: AvailabilityLevel }) {
  const look =
    level === "available"
      ? { text: "Available", cls: "border-success/50 text-success" }
      : level === "few"
        ? { text: "Almost full — few rooms left", cls: "border-amber-600/60 text-amber-700" }
        : { text: "Sold out", cls: "border-terracotta/60 text-terracotta" };
  return (
    <span className={cn("inline-block border px-2 py-0.5 text-xs tracking-[0.08em] whitespace-nowrap", look.cls)}>
      {look.text}
    </span>
  );
}

function RoomChoice({
  room,
  level,
  selected,
  onSelect,
}: {
  room: RoomType;
  level?: AvailabilityLevel;
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
        "overflow-hidden border text-left",
        selected ? "border-[#c6a15a] bg-[#12263d] text-[#f6f0e4]" : "border-[#c6a15a]/35 bg-[#fbf7ef]",
      )}
    >
      <img src={cover.src} alt="" className="h-44 w-full object-cover" />
      <span className="flex items-end justify-between gap-3 px-4 py-4">
        <span>
          <span className="block font-display text-3xl font-medium">{room.name}</span>
          <span className={cn("mt-1 block text-sm", selected ? "text-[#f6f0e4]/70" : "text-muted")}>
            {room.size} · up to {room.occupancy} guests
          </span>
          {level ? (
            <span className="mt-2 block">
              <AvailabilityBadge level={level} />
            </span>
          ) : null}
        </span>
        <span className="font-display text-2xl text-[#c6a15a] tabular-nums">{formatInr(room.price)}</span>
      </span>
    </button>
  );
}

function Confirmed({ booking, onAnother }: { booking: Booking; onAnother: () => void }) {
  const room = HOTEL.rooms.find((item) => item.id === booking.roomTypeId);
  return (
    <div className="mt-10 border border-[#c6a15a]/50 bg-[#12263d] p-6 text-[#f6f0e4] sm:p-8">
      <p className="text-[0.7rem] tracking-[0.24em] text-[#c6a15a] uppercase">
        {booking.status === "pending_payment" ? "Held — awaiting payment" : "Confirmed"}
      </p>
      <h2 className="mt-2 font-display text-4xl font-medium">{booking.id}</h2>
      <p className="mt-3 text-sm leading-relaxed">
        {room?.name ?? "Room"} · {booking.guestName}
        <br />
        {formatLongDate(booking.checkIn)} — {formatLongDate(booking.checkOut)} · {booking.nights} night
        {booking.nights === 1 ? "" : "s"} · {formatInr(booking.total)}
        {booking.row.guest_discount_amount > 0 ? (
          <>
            <br />
            Referral discount {booking.row.referral_code ? `(${booking.row.referral_code}) ` : ""}−
            {formatInr(booking.row.guest_discount_amount)} included
          </>
        ) : null}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[#f6f0e4]/75">
        Keep this number. The hotel sees the same stay. Find it later with this number and the phone used here.
      </p>
      <PayStay row={booking.row} />
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="gold" className="rounded-none tracking-[0.16em] uppercase">
          <Link to="/bookings">Find this stay</Link>
        </Button>
        <Button type="button" variant="outline" className="rounded-none tracking-[0.16em] uppercase" onClick={onAnother}>
          Book another
        </Button>
      </div>
    </div>
  );
}
