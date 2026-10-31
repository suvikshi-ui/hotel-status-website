import { useNavigate } from "@tanstack/react-router";
import { addDays, format, parseISO } from "date-fns";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { type ResolvedSearch } from "@/lib/search";
import { todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  value: ResolvedSearch;
  variant?: "hero" | "bar";
};

export function SearchPanel({ value, variant = "bar" }: Props) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value.checkIn, value.checkOut, value.guests, value.rooms]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = { ...draft };
    if (next.checkOut <= next.checkIn) {
      next.checkOut = format(addDays(parseISO(next.checkIn), 1), "yyyy-MM-dd");
    }
    void navigate({
      to: "/book/$hotelId",
      params: { hotelId: "residency" },
      search: {
        checkIn: next.checkIn,
        checkOut: next.checkOut,
        guests: next.guests,
        rooms: next.rooms,
      },
    });
  }

  const field =
    "h-11 w-full border-0 border-b border-ink/20 bg-transparent px-0 text-sm text-ink outline-none transition-colors duration-150 focus:border-ink";

  return (
    <form
      onSubmit={submit}
      className={cn(
        "grid w-full gap-4 bg-paper px-5 py-5 md:grid-cols-[1fr_1fr_0.7fr_auto] md:items-end md:px-8 md:py-6 lg:gap-8 lg:px-10 lg:py-8",
        variant === "hero" ? "" : "border border-ink/10",
      )}
    >
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-medium tracking-widest text-muted uppercase">Check-in</span>
        <input
          type="date"
          min={todayIso()}
          className={field}
          value={draft.checkIn}
          onChange={(e) => setDraft((d) => ({ ...d, checkIn: e.target.value }))}
          suppressHydrationWarning
        />
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-medium tracking-widest text-muted uppercase">Check-out</span>
        <input
          type="date"
          min={draft.checkIn}
          className={field}
          value={draft.checkOut}
          onChange={(e) => setDraft((d) => ({ ...d, checkOut: e.target.value }))}
          suppressHydrationWarning
        />
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-medium tracking-widest text-muted uppercase">Guests</span>
        <select
          className={cn(field, "appearance-none")}
          value={draft.guests}
          onChange={(e) => setDraft((d) => ({ ...d, guests: Number(e.target.value) }))}
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <Button type="submit" variant="gold" className="w-full rounded-none tracking-[0.16em] uppercase md:w-auto md:min-w-40">
        Book a stay
      </Button>
    </form>
  );
}
