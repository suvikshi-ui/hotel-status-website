import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { addDays, format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DateBlocks } from "@/components/date-blocks";
import {
  cancelOwnerBooking,
  collectBalance,
  listOwnerBookings,
  ownerRoomStatus,
  ownerStayStatus,
  paymentSetup,
  type BookingRow,
  type RoomStatus,
} from "@/lib/bookings.functions";
import { ownerSession, signOutOwnerDesk } from "@/lib/owner-auth.functions";
import { formatInr, formatLongDate, formatShortDate, nightsBetween, todayIso } from "@/lib/format";
import { paymentLabel, ROOM_LABELS } from "@/lib/booking-labels";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/owner")({
  beforeLoad: async () => {
    const { email } = await ownerSession();
    if (!email) throw redirect({ to: "/login" });
    return { ownerEmail: email };
  },
  component: OwnerPage,
  head: () => ({
    meta: [{ title: "Owner desk · Hotel Status Residency" }, { name: "robots", content: "noindex" }],
  }),
});

type Tab = "dashboard" | "bookings" | "arrivals" | "rooms";
const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "bookings", label: "Bookings" },
  { id: "arrivals", label: "Arrivals / Departures" },
  { id: "rooms", label: "Rooms" },
];

const roomName = (id: string) => ROOM_LABELS[id] ?? id;
const isLive = (row: BookingRow) => row.status === "confirmed" || row.status === "pending_payment";
const shiftIso = (iso: string, days: number) => format(addDays(parseISO(iso), days), "yyyy-MM-dd");

function bookingStatusText(row: BookingRow): string {
  if (row.status === "confirmed" && row.stay_status === "checked_in") return "Checked in";
  if (row.status === "confirmed" && row.stay_status === "checked_out") return "Checked out";
  return { pending_payment: "Awaiting payment", confirmed: "Confirmed", cancelled: "Cancelled", expired: "Expired" }[
    row.status
  ];
}

function OwnerPage() {
  const { ownerEmail } = Route.useRouteContext();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [rows, setRows] = useState<BookingRow[] | null>(null);
  const [linksOn, setLinksOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listOwnerBookings().then(
      (list) => live && setRows(list),
      (caught: unknown) => live && setError(caught instanceof Error ? caught.message : "Could not load bookings."),
    );
    paymentSetup().then(
      (setup) => live && setLinksOn(setup.links),
      () => live && setLinksOn(false),
    );
    return () => {
      live = false;
    };
  }, []);

  function replace(row: BookingRow | null) {
    if (row) setRows((list) => list?.map((item) => (item.id === row.id ? row : item)) ?? null);
  }

  async function act(id: string, action: () => Promise<BookingRow | null>) {
    setBusyId(id);
    setError(null);
    try {
      replace(await action());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That did not work.");
    } finally {
      setBusyId(null);
    }
  }

  const actions: Actions = {
    busyId,
    collect: (id) => act(id, () => collectBalance({ data: { id } })),
    cancel: (id) => {
      if (!window.confirm(`Cancel booking ${id}? Any refund owed under the policy is sent automatically.`)) return;
      void act(id, () => cancelOwnerBooking({ data: { id } }));
    },
    checkIn: (id) => act(id, () => ownerStayStatus({ data: { id, to: "checked_in" } })),
    checkOut: (id) => act(id, () => ownerStayStatus({ data: { id, to: "checked_out" } })),
    open: setOpenId,
  };

  const openRow = rows?.find((row) => row.id === openId) ?? null;

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="font-display text-xl leading-tight font-semibold sm:text-2xl">
            Hotel Status Residency
          </Link>
          <div className="flex items-center gap-3 text-right">
            <p className="hidden text-xs text-muted sm:block">{ownerEmail}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await signOutOwnerDesk();
                await navigate({ to: "/login" });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "border-b-2 px-3 py-3 text-xs tracking-[0.14em] whitespace-nowrap uppercase",
                tab === item.id ? "border-gold text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {error ? <p className="mb-4 border border-terracotta/40 p-3 text-sm text-terracotta">{error}</p> : null}
        {!linksOn ? (
          <p className="mb-4 text-sm text-ink-soft">Razorpay is not connected, so guests do not get a pay link.</p>
        ) : null}
        {!rows ? (
          <div className="glass h-40" />
        ) : tab === "dashboard" ? (
          <Dashboard rows={rows} actions={actions} />
        ) : tab === "bookings" ? (
          <BookingsTable rows={rows} actions={actions} />
        ) : tab === "arrivals" ? (
          <ArrivalsDepartures rows={rows} actions={actions} />
        ) : (
          <Rooms />
        )}
      </main>
      {openRow ? <BookingDrawer row={openRow} actions={actions} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

type Actions = {
  busyId: string | null;
  collect: (id: string) => void;
  cancel: (id: string) => void;
  checkIn: (id: string) => void;
  checkOut: (id: string) => void;
  open: (id: string) => void;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-ink/15 bg-cream p-4">
      <dt className="text-[11px] tracking-[0.16em] text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-display text-3xl tabular-nums">{value}</dd>
    </div>
  );
}

function Dashboard({ rows, actions }: { rows: BookingRow[]; actions: Actions }) {
  const today = todayIso();
  const confirmed = rows.filter((row) => row.status === "confirmed");
  const arrivals = confirmed.filter((row) => row.check_in === today);
  const departures = confirmed.filter((row) => row.check_out === today);
  const inHouse = confirmed.filter((row) => row.stay_status === "checked_in");
  const upcoming = rows.filter((row) => isLive(row) && row.check_in > today);
  const collected = rows.reduce((sum, row) => sum + Math.max(0, row.amount_paid - row.refund_amount), 0);
  const due = confirmed.reduce((sum, row) => sum + (row.stay_status === "checked_out" ? 0 : row.balance), 0);
  return (
    <>
      <h1 className="font-display text-4xl font-semibold">Dashboard</h1>
      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Arrivals today" value={arrivals.length} />
        <Stat label="Departures today" value={departures.length} />
        <Stat label="In house" value={inHouse.length} />
        <Stat label="Upcoming" value={upcoming.length} />
        <Stat label="Collected" value={formatInr(collected)} />
        <Stat label="Due" value={formatInr(due)} />
      </dl>
      <p className="mt-4 border border-terracotta/40 p-3 text-sm text-terracotta">
        OTA warning: website bookings are not sent to MakeMyTrip, FabHotels or Brevistay. Close sold rooms on each OTA
        extranet, and block OTA sales under Rooms.
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <DayList title="Arriving today" rows={arrivals} actions={actions} kind="arrival" />
        <DayList title="Departing today" rows={departures} actions={actions} kind="departure" />
      </div>
      <h2 className="mt-10 font-display text-2xl font-semibold">Latest bookings</h2>
      <BookingsTable rows={rows.slice(0, 8)} actions={actions} compact />
    </>
  );
}

function DayList({
  title,
  rows,
  actions,
  kind,
}: {
  title: string;
  rows: BookingRow[];
  actions: Actions;
  kind: "arrival" | "departure";
}) {
  return (
    <section>
      <h3 className="text-xs tracking-[0.16em] text-muted uppercase">
        {title} · {rows.length}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">None.</p>
      ) : (
        <ul className="mt-2 divide-y divide-ink/10 border border-ink/15 bg-cream">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <button type="button" className="text-left" onClick={() => actions.open(row.id)}>
                <span className="font-medium">{row.guest_name}</span>
                <span className="block text-xs text-muted">
                  {row.id} · {row.rooms} × {roomName(row.room_type)} · {bookingStatusText(row)}
                  {row.balance > 0 ? ` · due ${formatInr(row.balance)}` : ""}
                </span>
              </button>
              <StayButtons row={row} actions={actions} only={kind === "arrival" ? "in" : "out"} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StayButtons({ row, actions, only }: { row: BookingRow; actions: Actions; only?: "in" | "out" }) {
  const busy = actions.busyId === row.id;
  if (row.status !== "confirmed") return null;
  if (row.stay_status === "none" && only !== "out")
    return (
      <Button size="sm" variant="outline" disabled={busy} onClick={() => actions.checkIn(row.id)}>
        Check in
      </Button>
    );
  if (row.stay_status === "checked_in" && only !== "in")
    return (
      <Button size="sm" variant="outline" disabled={busy} onClick={() => actions.checkOut(row.id)}>
        Check out
      </Button>
    );
  return null;
}

type SortKey = "created_at" | "check_in" | "check_out" | "total_amount" | "balance" | "guest_name";
const STATUS_FILTERS = [
  ["all", "All statuses"],
  ["pending_payment", "Awaiting payment"],
  ["confirmed", "Confirmed (not arrived)"],
  ["checked_in", "Checked in"],
  ["checked_out", "Checked out"],
  ["cancelled", "Cancelled"],
  ["expired", "Expired"],
] as const;

function matchesStatus(row: BookingRow, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "checked_in" || filter === "checked_out") return row.status === "confirmed" && row.stay_status === filter;
  if (filter === "confirmed") return row.status === "confirmed" && row.stay_status === "none";
  return row.status === filter;
}

const th = "px-3 py-2 text-left text-[11px] font-medium tracking-[0.12em] whitespace-nowrap text-muted uppercase";
const td = "px-3 py-2 whitespace-nowrap";

function BookingsTable({ rows, actions, compact }: { rows: BookingRow[]; actions: Actions; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortKey>("created_at");
  const [desc, setDesc] = useState(true);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter((row) => {
      if (!matchesStatus(row, status)) return false;
      // Date range: stays that overlap [from, to].
      if (from && row.check_out < from) return false;
      if (to && row.check_in > to) return false;
      if (!q) return true;
      return [row.id, row.guest_name, row.phone, row.email].some((v) => v.toLowerCase().includes(q));
    });
    out.sort((a, b) => {
      const x = a[sort];
      const y = b[sort];
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return desc ? -cmp : cmp;
    });
    return out;
  }, [rows, query, status, from, to, sort, desc]);

  function header(key: SortKey, label: string) {
    return (
      <th className={th}>
        <button
          type="button"
          className="uppercase"
          onClick={() => {
            if (sort === key) setDesc(!desc);
            else {
              setSort(key);
              setDesc(true);
            }
          }}
        >
          {label}
          {sort === key ? (desc ? " ↓" : " ↑") : ""}
        </button>
      </th>
    );
  }

  const input = "h-10 border border-ink/20 bg-transparent px-2 text-sm";
  return (
    <>
      {!compact ? (
        <>
          <h1 className="font-display text-4xl font-semibold">Bookings</h1>
          <div className="mt-6 flex flex-wrap items-end gap-3">
            <input
              className={cn(input, "min-w-56 flex-1")}
              placeholder="Search ID, guest, phone, email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_FILTERS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label className="flex flex-col text-[11px] text-muted uppercase">
              Stay from
              <input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="flex flex-col text-[11px] text-muted uppercase">
              to
              <input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            {query || status !== "all" || from || to ? (
              <Button size="sm" variant="ghost" onClick={() => { setQuery(""); setStatus("all"); setFrom(""); setTo(""); }}>
                Clear
              </Button>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-muted">{list.length} bookings</p>
        </>
      ) : null}
      <div className="mt-3 overflow-x-auto border border-ink/15 bg-cream">
        <table className="w-full text-sm tabular-nums">
          <thead className="border-b border-ink/15">
            <tr>
              <th className={th}>Booking</th>
              {header("guest_name", "Guest")}
              <th className={th}>Phone</th>
              <th className={th}>Email</th>
              <th className={th}>Room</th>
              {header("check_in", "Check-in")}
              {header("check_out", "Check-out")}
              <th className={th}>Guests</th>
              {header("total_amount", "Total")}
              <th className={th}>Paid</th>
              {header("balance", "Due")}
              <th className={th}>Payment</th>
              <th className={th}>Status</th>
              {header("created_at", "Created")}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {list.length === 0 ? (
              <tr>
                <td className={td} colSpan={14}>
                  <span className="text-muted">No bookings match.</span>
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.id} className="cursor-pointer hover:bg-ink/5" onClick={() => actions.open(row.id)}>
                  <td className={cn(td, "font-medium underline decoration-ink/30 underline-offset-4")}>{row.id}</td>
                  <td className={td}>{row.guest_name}</td>
                  <td className={td}>{row.phone}</td>
                  <td className={td}>{row.email}</td>
                  <td className={td}>
                    {row.rooms} × {roomName(row.room_type)}
                  </td>
                  <td className={td}>{formatShortDate(row.check_in)}</td>
                  <td className={td}>{formatShortDate(row.check_out)}</td>
                  <td className={td}>{row.guests}</td>
                  <td className={td}>{formatInr(row.total_amount)}</td>
                  <td className={td}>{formatInr(row.amount_paid)}</td>
                  <td className={td}>{isLive(row) ? formatInr(row.balance) : "—"}</td>
                  <td className={td}>{paymentLabel(row.payment_status)}</td>
                  <td className={td}>
                    <StatusChip row={row} />
                  </td>
                  <td className={td}>{format(new Date(row.created_at), "d MMM, HH:mm")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusChip({ row }: { row: BookingRow }) {
  const text = bookingStatusText(row);
  const tone =
    row.status === "cancelled" || row.status === "expired"
      ? "border-ink/20 text-muted"
      : row.status === "pending_payment"
        ? "border-gold text-gold"
        : "border-success/50 text-success";
  return <span className={cn("inline-block border px-2 py-0.5 text-xs", tone)}>{text}</span>;
}

function ArrivalsDepartures({ rows, actions }: { rows: BookingRow[]; actions: Actions }) {
  const today = todayIso();
  const days = Array.from({ length: 8 }, (_, i) => shiftIso(today, i));
  const live = rows.filter((row) => row.status === "confirmed" || row.status === "pending_payment");
  return (
    <>
      <h1 className="font-display text-4xl font-semibold">Arrivals / Departures</h1>
      <p className="mt-2 text-sm text-ink-soft">Today and the next 7 days. Awaiting-payment holds are shown too.</p>
      <div className="mt-6 grid gap-6">
        {days.map((day) => {
          const arriving = live.filter((row) => row.check_in === day);
          const leaving = live.filter((row) => row.check_out === day);
          return (
            <section key={day} className="border border-ink/15 p-4">
              <h2 className="font-display text-2xl font-semibold">
                {day === today ? "Today · " : ""}
                {format(parseISO(day), "EEEE d MMMM")}
              </h2>
              <div className="mt-3 grid gap-6 md:grid-cols-2">
                <DayList title="Arrivals" rows={arriving} actions={actions} kind="arrival" />
                <DayList title="Departures" rows={leaving} actions={actions} kind="departure" />
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function Rooms() {
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState<RoomStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setStatus(null);
    ownerRoomStatus({ data: { date } }).then(
      (list) => live && setStatus(list),
      (caught: unknown) => live && setError(caught instanceof Error ? caught.message : "Could not load rooms."),
    );
    return () => {
      live = false;
    };
  }, [date]);
  const total = status?.reduce(
    (acc, r) => ({ capacity: acc.capacity + r.capacity, booked: acc.booked + r.booked, blocked: acc.blocked + r.blocked, available: acc.available + r.available }),
    { capacity: 0, booked: 0, blocked: 0, available: 0 },
  );
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold">Rooms</h1>
        <label className="flex flex-col text-[11px] text-muted uppercase">
          Night of
          <input
            type="date"
            className="h-10 border border-ink/20 bg-transparent px-2 text-sm text-ink"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-terracotta">{error}</p> : null}
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {status
          ? [...status, ...(total ? [{ room_type: "All rooms", ...total }] : [])].map((r) => (
              <div key={r.room_type} className="border border-ink/15 bg-cream p-4">
                <p className="text-xs tracking-[0.16em] text-gold uppercase">{roomName(r.room_type)}</p>
                <p className="mt-1 font-display text-4xl tabular-nums">
                  {r.available}
                  <span className="text-lg text-muted"> / {r.capacity} free</span>
                </p>
                <div className="mt-3 flex h-2 overflow-hidden bg-ink/10">
                  <div className="bg-success" style={{ width: `${(r.booked / Math.max(1, r.capacity)) * 100}%` }} />
                  <div className="bg-terracotta" style={{ width: `${(r.blocked / Math.max(1, r.capacity)) * 100}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted tabular-nums">
                  Booked {r.booked} · Blocked {r.blocked}
                  {r.booked + r.blocked > r.capacity ? " · OVERBOOKED" : ""}
                </p>
              </div>
            ))
          : <div className="glass h-28 md:col-span-4" />}
      </div>
      <p className="mt-2 text-xs text-muted">
        Booked counts confirmed stays and unexpired payment holds for that night. Blocked counts the blocks below.
      </p>
      <DateBlocks />
    </>
  );
}

function BookingDrawer({ row, actions, onClose }: { row: BookingRow; actions: Actions; onClose: () => void }) {
  const busy = actions.busyId === row.id;
  const live = isLive(row);
  const line = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b border-ink/10 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md overflow-y-auto bg-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Booking ${row.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest text-muted uppercase">{row.id}</p>
            <h2 className="mt-1 font-display text-3xl font-semibold">{row.guest_name}</h2>
            <div className="mt-2">
              <StatusChip row={row} />
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <h3 className="mt-6 text-xs tracking-[0.16em] text-gold uppercase">Guest</h3>
        <dl>
          {line("Phone", <a href={`tel:+91${row.phone}`}>{row.phone}</a>)}
          {line("Email", <a href={`mailto:${row.email}`}>{row.email}</a>)}
          {line("Guests", row.guests)}
        </dl>
        <h3 className="mt-6 text-xs tracking-[0.16em] text-gold uppercase">Stay</h3>
        <dl>
          {line("Room", `${row.rooms} × ${roomName(row.room_type)}`)}
          {line("Check-in", formatLongDate(row.check_in))}
          {line("Check-out", formatLongDate(row.check_out))}
          {line("Nights", nightsBetween(row.check_in, row.check_out))}
          {row.checked_in_at ? line("Checked in at", format(new Date(row.checked_in_at), "d MMM, HH:mm")) : null}
          {row.checked_out_at ? line("Checked out at", format(new Date(row.checked_out_at), "d MMM, HH:mm")) : null}
          {line("Booked on", format(new Date(row.created_at), "d MMM yyyy, HH:mm"))}
        </dl>
        <h3 className="mt-6 text-xs tracking-[0.16em] text-gold uppercase">Payment</h3>
        <dl>
          {line("Total", formatInr(row.total_amount))}
          {line("Paid", formatInr(row.amount_paid))}
          {line("Due", live ? formatInr(row.balance) : "—")}
          {line("Mode", { full: "Full online", advance: "Advance online", pay_at_hotel: "Pay at hotel" }[row.payment_mode] ?? row.payment_mode)}
          {line("Status", paymentLabel(row.payment_status))}
          {row.payment_id ? line("Razorpay payment", row.payment_id) : null}
          {row.refund_amount > 0
            ? line("Refund", `${formatInr(row.refund_amount)} · ${row.refund_status === "failed" ? "refund by hand" : row.refund_status}`)
            : null}
          {row.invoice_number
            ? line(
                "Invoice",
                <a className="underline" href={`/invoice/${row.id}?t=${row.manage_token}`} target="_blank" rel="noreferrer">
                  {row.invoice_number}
                </a>,
              )
            : null}
          {row.status === "pending_payment" && row.payment_url
            ? line("Pay link", <a className="underline" href={row.payment_url} target="_blank" rel="noreferrer">Razorpay link</a>)
            : null}
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          <StayButtons row={row} actions={actions} />
          {row.status === "confirmed" && row.balance > 0 ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => actions.collect(row.id)}>
              Balance collected at desk
            </Button>
          ) : null}
          {live && row.stay_status === "none" ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => actions.cancel(row.id)}>
              Cancel booking
            </Button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
