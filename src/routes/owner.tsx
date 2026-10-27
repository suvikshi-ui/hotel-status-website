import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { DateBlocks } from "@/components/date-blocks";
import { cancelOwnerBooking, collectBalance, listOwnerBookings, paymentSetup, type BookingRow } from "@/lib/bookings.functions";
import { formatInr, formatLongDate, nightsBetween, todayIso } from "@/lib/format";
import { HOTEL } from "@/lib/hotels";
import { statusLabel } from "@/lib/booking-labels";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/owner")({
  component: OwnerPage,
  head: () => ({
    meta: [{ title: "Owner desk · Hotel Status Residency" }],
  }),
});

function OwnerPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <OwnerShell>
        <div className="glass mt-10 h-40" />
      </OwnerShell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  const allowed = user.primaryEmail?.toLowerCase() === HOTEL.email.toLowerCase();
  if (!allowed) {
    return (
      <OwnerShell>
        <h1 className="mt-3 font-display text-4xl font-semibold">Not the hotel desk</h1>
        <p className="mt-3 max-w-xl text-sm text-ink-soft">
          Signed in as {user.primaryEmail ?? "another account"}. The booking desk is only for {HOTEL.email}.
        </p>
        <div className="mt-6">
          <UserButton />
        </div>
      </OwnerShell>
    );
  }
  return (
    <OwnerShell>
      <OwnerDesk />
    </OwnerShell>
  );
}

function OwnerDesk() {
  const [rows, setRows] = useState<BookingRow[] | null>(null);
  const [linksOn, setLinksOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listOwnerBookings()
      .then((list) => {
        if (live) setRows(list);
      })
      .catch((caught: unknown) => {
        if (live) setError(caught instanceof Error ? caught.message : "Could not load bookings.");
      });
    paymentSetup()
      .then((setup) => {
        if (live) setLinksOn(setup.links);
      })
      .catch(() => {
        if (live) setLinksOn(false);
      });
    return () => {
      live = false;
    };
  }, []);

  async function collect(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const row = await collectBalance({ data: { id } });
      if (row) setRows((list) => list?.map((item) => (item.id === row.id ? row : item)) ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record the payment.");
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const row = await cancelOwnerBooking({ data: { id } });
      if (!row) return;
      setRows((current) => current?.map((item) => (item.id === id ? row : item)) ?? current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not cancel.");
    } finally {
      setBusyId(null);
    }
  }

  const today = todayIso();
  const confirmed = rows?.filter((row) => row.status === "confirmed") ?? [];
  const arriving = confirmed.filter((row) => row.check_in === today).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-gold uppercase">Booking partner</p>
          <h1 className="mt-2 font-display text-5xl font-semibold">Bookings</h1>
          <p className="mt-3 max-w-xl text-sm text-ink-soft">
            Every stay a guest confirms on the website. Name, phone, room, and dates — not mixed into the guest pages.
          </p>
        </div>
        <UserButton />
      </div>

      <dl className="mt-8 grid grid-cols-3 gap-3 border-y border-ink/10 py-5">
        <div>
          <dt className="text-xs tracking-[0.16em] text-muted uppercase">Confirmed</dt>
          <dd className="mt-1 font-display text-3xl tabular-nums">{rows ? confirmed.length : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-[0.16em] text-muted uppercase">Arriving</dt>
          <dd className="mt-1 font-display text-3xl tabular-nums">{rows ? arriving : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-[0.16em] text-muted uppercase">All</dt>
          <dd className="mt-1 font-display text-3xl tabular-nums">{rows ? rows.length : "—"}</dd>
        </div>
      </dl>

      <p className="mt-4 border border-terracotta/40 p-3 text-sm text-terracotta">
        OTA warning: website bookings are not sent to MakeMyTrip, FabHotels or Brevistay, and their bookings do not
        reach this site. Close sold rooms on each OTA extranet, and use “Block dates” below for OTA sales.
      </p>

      {error ? <p className="mt-4 text-sm text-terracotta">{error}</p> : null}
      {!linksOn ? (
        <p className="mt-4 text-sm text-ink-soft">
          Razorpay is not connected yet, so guests do not get a pay link. Add the API key id and secret on the host.
        </p>
      ) : null}

      {!rows ? (
        <div className="glass mt-8 h-40" />
      ) : rows.length === 0 ? (
        <div className="mt-8 border border-ink/15 p-6">
          <h2 className="font-display text-2xl font-semibold">No bookings yet.</h2>
          <p className="mt-2 text-sm text-muted">When a guest confirms a stay, it shows up here.</p>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {rows.map((row) => {
            const room = HOTEL.rooms.find((item) => item.id === row.room_type);
            const cancelled = row.status === "cancelled" || row.status === "expired";
            return (
              <li key={row.id} className="border border-ink/15 bg-cream p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs tracking-widest text-muted uppercase tabular-nums">{row.id}</p>
                  <span className={cn("text-xs font-medium", cancelled ? "text-muted" : "text-success")}>
                    {statusLabel(row)}
                  </span>
                </div>
                <h2 className="mt-2 font-display text-3xl font-semibold">{row.guest_name}</h2>
                <p className="mt-1 text-sm">
                  <a href={`tel:+91${row.phone}`} className="tabular-nums">
                    {row.phone}
                  </a>
                  {" · "}
                  <a href={`mailto:${row.email}`}>{row.email}</a>
                </p>
                <p className="mt-3 text-sm">
                  {room?.name ?? row.room_type} · {formatLongDate(row.check_in)} — {formatLongDate(row.check_out)} ·{" "}
                  {nightsBetween(row.check_in, row.check_out)} nights · {row.guests} guests · {row.rooms} room
                  {row.rooms === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-sm tabular-nums">
                  {formatInr(row.total_amount)} · paid {formatInr(row.amount_paid)}
                  {row.balance > 0 && !cancelled ? ` · balance ${formatInr(row.balance)}` : ""}
                </p>
                {row.status === "confirmed" && row.balance > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 mr-2"
                    disabled={busyId === row.id}
                    onClick={() => void collect(row.id)}
                  >
                    Balance collected at desk
                  </Button>
                ) : null}
                {row.invoice_number ? (
                  <a className="text-xs underline" href={`/invoice/${row.id}?t=${row.manage_token}`} target="_blank" rel="noreferrer">
                    Invoice {row.invoice_number}
                  </a>
                ) : null}
                {row.refund_amount > 0 ? (
                  <span className="text-xs">
                    Refund ₹{row.refund_amount} · {row.refund_status === "failed" ? "refund by hand" : row.refund_status}
                  </span>
                ) : null}
                {row.status === "pending_payment" && row.payment_url ? (
                  <a href={row.payment_url} className="mt-3 inline-block text-sm underline">
                    Razorpay link
                  </a>
                ) : null}
                {!cancelled ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-4"
                    disabled={busyId === row.id}
                    onClick={() => void cancel(row.id)}
                  >
                    Cancel booking
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <DateBlocks />
    </>
  );
}

function OwnerShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex h-20 max-w-3xl items-center justify-between gap-4 px-4">
          <Link to="/" className="font-display text-xl leading-tight font-semibold sm:text-2xl">
            Hotel Status Residency
          </Link>
          <p className="text-xs tracking-[0.18em] text-gold uppercase">Owner desk</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">{children}</main>
    </div>
  );
}
