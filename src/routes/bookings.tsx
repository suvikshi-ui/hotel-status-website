import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { PageShell } from "@/components/site-chrome";
import { PayStay } from "@/components/pay-stay";
import { Button } from "@/components/ui/button";
import { cancelGuestBooking, findBooking, refreshPayment, type BookingRow } from "@/lib/bookings.functions";
import { formatInr, formatLongDate, nightsBetween } from "@/lib/format";
import { HOTEL } from "@/lib/hotels";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bookings")({
  validateSearch: (search: Record<string, unknown>): { paid?: string } => ({
    paid: typeof search.paid === "string" ? search.paid : undefined,
  }),
  component: FindBookingPage,
  head: () => ({
    meta: [{ title: "Your stay · Hotel Status Residency" }],
  }),
});

const field =
  "h-11 w-full border-0 border-b border-ink/20 bg-transparent px-0 text-sm text-ink outline-none focus:border-ink";

function FindBookingPage() {
  const { paid } = Route.useSearch();
  const [id, setId] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingRow | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const row = await findBooking({ data: { id, phone } });
      setBooking(row);
      if (!row) setError("No stay matches that booking number and phone.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not look up the stay.");
    } finally {
      setPending(false);
    }
  }

  async function checkPayment() {
    if (!booking) return;
    setPending(true);
    setError(null);
    try {
      const row = await refreshPayment({ data: { id: booking.id, phone } });
      if (!row) {
        setError("No stay matches that booking number and phone.");
        return;
      }
      setBooking(row);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not check the payment.");
    } finally {
      setPending(false);
    }
  }

  async function cancel() {
    if (!booking) return;
    setPending(true);
    setError(null);
    try {
      const row = await cancelGuestBooking({ data: { id: booking.id, phone } });
      if (!row) {
        setError("That stay is already cancelled, or the phone does not match.");
        return;
      }
      setBooking(row);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not cancel the stay.");
    } finally {
      setPending(false);
    }
  }

  const room = HOTEL.rooms.find((item) => item.id === booking?.room_type);

  return (
    <PageShell>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs font-medium tracking-widest text-gold uppercase">Guests</p>
        <h1 className="mt-1 font-display text-4xl font-semibold">Find your stay</h1>
        <p className="mt-2 max-w-xl text-ink-soft">
          Use the booking number from your confirmation and the phone you booked with. Other guests’ stays stay private.
        </p>

        <form onSubmit={onSubmit} className="mt-10 grid gap-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs tracking-[0.18em] text-muted uppercase">Booking number</span>
            <input
              id="lookup-id"
              required
              autoComplete="off"
              placeholder="HSR-000000"
              className={field}
              value={id}
              onChange={(event) => setId(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs tracking-[0.18em] text-muted uppercase">Phone</span>
            <input
              id="lookup-phone"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel"
              className={field}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <Button type="submit" variant="ink" disabled={pending} className="rounded-none tracking-[0.16em] uppercase">
            {pending ? "Looking…" : "Find"}
          </Button>
        </form>

        {paid === "0" ? (
          <p className="mt-4 text-sm text-terracotta">Payment was not completed.</p>
        ) : paid && /^HSR-\d{6}$/.test(paid) ? (
          <p className="mt-4 text-sm text-success">Payment received for {paid}. Look the stay up to see it here.</p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-terracotta">{error}</p> : null}

        {booking ? (
          <article className="mt-8 border border-ink/15 bg-cream p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs tracking-widest text-muted uppercase tabular-nums">{booking.id}</p>
              <span className={cn("text-xs font-medium", booking.status === "cancelled" ? "text-muted" : "text-success")}>
                {booking.status === "cancelled" ? "Cancelled" : "Confirmed"}
              </span>
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold">{room?.name ?? "Room"}</h2>
            <p className="mt-2 text-sm">
              {booking.guest_name}
              <br />
              {formatLongDate(booking.check_in)} — {formatLongDate(booking.check_out)} ·{" "}
              {nightsBetween(booking.check_in, booking.check_out)} nights · {booking.guests} guests · {booking.rooms}{" "}
              room{booking.rooms === 1 ? "" : "s"}
            </p>
            <p className="mt-2 text-sm tabular-nums">{formatInr(booking.total_amount)}</p>
            {booking.status === "confirmed" ? (
              <PayStay status={booking.payment_status} url={booking.payment_url} amount={booking.total_amount} />
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="rounded-none tracking-[0.14em] uppercase">
                <Link to="/book/$hotelId" params={{ hotelId: HOTEL.id }}>
                  Book again
                </Link>
              </Button>
              {booking.status === "confirmed" && booking.payment_status !== "paid" && booking.payment_url ? (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => void checkPayment()}>
                  I’ve paid
                </Button>
              ) : null}
              {booking.status === "confirmed" ? (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => void cancel()}>
                  Cancel stay
                </Button>
              ) : null}
            </div>
          </article>
        ) : null}
      </main>
    </PageShell>
  );
}
