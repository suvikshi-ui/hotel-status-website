import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { addBlock, listBlocks, removeBlock, type DateBlock } from "@/lib/bookings.functions";
import { ROOM_LABELS } from "@/lib/booking-labels";

const SOURCES = ["makemytrip", "fabhotels", "brevistay", "walk-in", "maintenance", "other"] as const;
const field = "h-10 border border-ink/20 bg-transparent px-2 text-sm";

/** Owner tool: hold rooms sold elsewhere so the website cannot double-book them. */
export function DateBlocks() {
  const [blocks, setBlocks] = useState<DateBlock[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listBlocks().then(setBlocks, () => setBlocks([]));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      setBlocks(
        await addBlock({
          data: {
            room_type: String(form.get("room_type")) as "deluxe",
            rooms: Number(form.get("rooms")),
            start_date: String(form.get("start_date")),
            end_date: String(form.get("end_date")),
            source: String(form.get("source")) as (typeof SOURCES)[number],
            note: String(form.get("note") ?? ""),
          },
        }),
      );
      event.currentTarget?.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not block those dates.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 border-t border-ink/10 pt-8">
      <h2 className="font-display text-2xl font-semibold">Block dates</h2>
      <p className="mt-2 max-w-2xl text-sm text-terracotta">
        The website is not connected to MakeMyTrip, FabHotels or Brevistay. When a room is sold there, block it here
        straight away (and close it there when a website booking comes in), or the same room can be sold twice.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-2">
        <select name="room_type" className={field} aria-label="Room type">
          {Object.entries(ROOM_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input name="rooms" type="number" min={1} defaultValue={1} className={`${field} w-20`} aria-label="Rooms" />
        <input name="start_date" type="date" required className={field} aria-label="From (first night)" />
        <input name="end_date" type="date" required className={field} aria-label="Until (check-out day)" />
        <select name="source" className={field} aria-label="Sold on">
          {SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input name="note" placeholder="Note" className={field} />
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Block"}</Button>
      </form>
      {error ? <p className="mt-2 text-sm text-terracotta">{error}</p> : null}
      <ul className="mt-4 space-y-2 text-sm">
        {blocks?.length === 0 ? <li className="text-ink-soft">No upcoming blocks.</li> : null}
        {blocks?.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-3">
            <span>
              {ROOM_LABELS[b.room_type] ?? b.room_type} × {b.rooms} · {b.start_date} → {b.end_date} · {b.source}
              {b.note ? ` · ${b.note}` : ""}
            </span>
            <button
              type="button"
              className="text-xs underline"
              onClick={() => void removeBlock({ data: { id: b.id } }).then(setBlocks)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
