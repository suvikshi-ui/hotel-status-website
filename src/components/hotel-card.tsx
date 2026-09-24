import { Link } from "@tanstack/react-router";
import { StatusChip } from "@/components/status-chip";
import { formatInr } from "@/lib/format";
import type { Hotel } from "@/lib/hotels";
import { type ResolvedSearch } from "@/lib/search";
import { getHotelStatus } from "@/lib/status";
import { useBookings } from "@/lib/bookings";

export function HotelCard({ hotel, search }: { hotel: Hotel; search: ResolvedSearch }) {
  useBookings((s) => s.bookings);
  const status = getHotelStatus(hotel, search.checkIn, search.checkOut);

  return (
    <Link to="/contact" className="glass group flex flex-col rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted uppercase">
            {hotel.locality} · {hotel.city}
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
            {hotel.name}
          </h3>
          <p className="mt-1 text-sm text-muted">{hotel.tagline}</p>
        </div>
        <StatusChip status={status} />
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="text-sm tabular-nums text-muted">PIN {hotel.pins.join(" / ")}</p>
        <p className="font-display text-xl font-semibold tabular-nums">{formatInr(hotel.price)}</p>
      </div>
    </Link>
  );
}
