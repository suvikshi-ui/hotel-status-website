import { addMonths, format, parseISO } from "date-fns";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/format";
import { ROOM_LABELS } from "@/lib/booking-labels";
import { ownerMonthRates, ownerSetRateRange, type NightRate } from "@/lib/referrals.functions";

const field = "h-10 rounded-md border border-[#d5dbe3] bg-white px-2 text-sm";

function thisMonth(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 7);
}

export function RateCalendar() {
  const [month, setMonth] = useState(thisMonth);
  const [room, setRoom] = useState<"deluxe" | "suite">("deluxe");
  const [rows, setRows] = useState<NightRate[] | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setRows(null);
    ownerMonthRates({ data: { room_type: room, month } }).then(
      (list) => live && setRows(list),
      (caught: unknown) => live && setError(caught instanceof Error ? caught.message : "Could not load rates."),
    );
    return () => {
      live = false;
    };
  }, [month, room]);

  function shift(by: number) {
    setMonth(format(addMonths(parseISO(`${month}-01`), by), "yyyy-MM"));
  }

  async function apply(event: FormEvent) {
    event.preventDefault();
    const amount = Math.round(Number(price));
    if (!start || !end || end < start) {
      setError("Choose a start date and an end date.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 1) {
      setError("Enter a rate of at least ₹1.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const list = await ownerSetRateRange({ data: { room_type: room, start, end, price: amount } });
      if (start.slice(0, 7) === month) setRows(list);
      else setMonth(start.slice(0, 7));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update those dates.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-lg border border-[#e4e8ee] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1b2a6b]">Date rates</h2>
          <p className="mt-1 max-w-xl text-sm text-[#5c6570]">
            Set one rate from a date to a date. The website shows that rate. A date you have not updated stays at ₹2,500 for Deluxe and ₹6,000 for Suite.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => shift(-1)}>
            Previous
          </Button>
          <p className="min-w-28 text-center text-sm font-semibold text-[#1b2a6b]">
            {format(parseISO(`${month}-01`), "MMMM yyyy")}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => shift(1)}>
            Next
          </Button>
        </div>
      </div>

      <form onSubmit={apply} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-[11px] font-medium text-[#6b7280]">
          Room
          <select className={field} value={room} onChange={(e) => setRoom(e.target.value as "deluxe" | "suite")}>
            <option value="deluxe">Deluxe</option>
            <option value="suite">Suite</option>
          </select>
        </label>
        <label className="flex flex-col text-[11px] font-medium text-[#6b7280]">
          From
          <input type="date" required className={field} value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="flex flex-col text-[11px] font-medium text-[#6b7280]">
          To
          <input type="date" required className={field} value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label className="flex flex-col text-[11px] font-medium text-[#6b7280]">
          Rate per night (₹)
          <input
            type="number"
            min={1}
            required
            className={`${field} w-32`}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Update these dates"}
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm text-terracotta">{error}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#1b2a6b] text-left text-[11px] font-medium text-white">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">{ROOM_LABELS[room] ?? room} rate</th>
              <th className="px-3 py-2">Set for this date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4e8ee]">
            {rows?.map((row) => (
              <tr key={row.night}>
                <td className="px-3 py-2">{format(parseISO(row.night), "EEE d MMM")}</td>
                <td className="px-3 py-2 font-medium tabular-nums">{formatInr(row.price)}</td>
                <td className="px-3 py-2 text-[#6b7280]">{row.custom ? "Yes" : "Default"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows ? <p className="px-3 py-4 text-sm text-[#6b7280]">Loading the month…</p> : null}
      </div>
    </section>
  );
}
