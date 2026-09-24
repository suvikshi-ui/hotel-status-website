import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { useBookings } from "@/lib/bookings";
import { formatInr, formatLongDate } from "@/lib/format";
import { HOTEL } from "@/lib/hotels";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bookings")({
  component: BookingsPage,
});

function BookingsPage() {
  const bookings = useBookings((s) => s.bookings);
  const cancel = useBookings((s) => s.cancel);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <PageShell>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs font-medium tracking-widest text-gold uppercase">Your board</p>
        <h1 className="mt-1 font-display text-4xl font-semibold">My bookings</h1>
        <p className="mt-2 text-ink-soft">
          Every order is issued as {HOTEL.name}. This list stays on this device.
        </p>

        {!ready ? (
          <div className="glass mt-10 h-40 rounded-lg" />
        ) : bookings.length === 0 ? (
          <div className="glass mt-10 rounded-lg p-8">
            <h2 className="font-display text-2xl font-semibold">No rooms yet.</h2>
            <p className="mt-2 text-sm text-muted">Hold a night at the Mahape residency.</p>
            <Button asChild className="mt-6">
              <Link to="/contact">Contact</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {bookings.map((booking) => {
              const room = HOTEL.rooms.find((r) => r.id === booking.roomTypeId);
              const cancelled = booking.status === "cancelled";
              return (
                <li key={booking.id} className="glass rounded-xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs tracking-widest text-muted uppercase tabular-nums">
                      {booking.id}
                    </p>
                    <span className={cn("text-xs font-medium", cancelled ? "text-muted" : "text-success")}>
                      {cancelled ? "Cancelled" : "Confirmed"}
                    </span>
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-semibold">{HOTEL.name}</h2>
                  <p className="text-sm text-muted">
                    {HOTEL.locality}, {HOTEL.city} · PIN {HOTEL.pins.join(" / ")}
                  </p>
                  <p className="mt-3 text-sm">
                    {room?.name} · {formatLongDate(booking.checkIn)} — {formatLongDate(booking.checkOut)}{" "}
                    · {booking.nights} night{booking.nights === 1 ? "" : "s"} · {booking.guests} guests
                  </p>
                  <p className="mt-1 text-sm tabular-nums">{formatInr(booking.total)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/">Hotel</Link>
                    </Button>
                    {!cancelled ? (
                      <Button size="sm" variant="ghost" onClick={() => cancel(booking.id)}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </PageShell>
  );
}
