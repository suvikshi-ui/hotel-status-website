import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/site-chrome";
import { PayStay } from "@/components/pay-stay";
import { Button } from "@/components/ui/button";
import { cancelManagedBooking, getManagedBooking, type ManageView } from "@/lib/bookings.functions";
import { statusLabel } from "@/lib/booking-labels";
import { formatInr, formatLongDate } from "@/lib/format";

export const Route = createFileRoute("/manage/$id")({
  validateSearch: (search: Record<string, unknown>): { t?: string } => ({
    t: typeof search.t === "string" ? search.t : undefined,
  }),
  component: ManagePage,
  head: () => ({ meta: [{ title: "Manage your stay · Hotel Status Residency" }, { name: "robots", content: "noindex" }] }),
});

function ManagePage() {
  const { id } = Route.useParams();
  const { t } = Route.useSearch();
  const [view, setView] = useState<ManageView | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!t) return setView(null);
    getManagedBooking({ data: { id, token: t } }).then(setView, () => setView(null));
  }, [id, t]);

  async function cancel() {
    if (!view || !t) return;
    const refund = view.refundIfCancelled;
    const ok = window.confirm(
      refund > 0
        ? `Cancel this booking? ${formatInr(refund)} will be refunded.`
        : "Cancel this booking? No refund is due under the cancellation policy.",
    );
    if (!ok) return;
    setBusy(true);
    try {
      const row = await cancelManagedBooking({ data: { id, token: t } });
      if (row) {
        setView({ ...view, row, refundIfCancelled: 0 });
        setMessage(row.refund_amount > 0 ? `Cancelled. Refund of ${formatInr(row.refund_amount)} started.` : "Cancelled.");
      } else setMessage("This booking can no longer be cancelled online. Please call the hotel.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="font-display text-3xl leading-tight">Your stay</h1>
        {view === undefined ? (
          <p className="mt-6 text-sm text-ink/60">Loading…</p>
        ) : view === null ? (
          <p className="mt-6 text-sm text-ink/70">
            This link is not valid. <Link to="/bookings" className="underline">Find your booking</Link> with your booking number and phone.
          </p>
        ) : (
          <div className="mt-6 space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-y-2">
              <dt className="text-ink/60">Booking</dt><dd className="font-mono">{view.row.id}</dd>
              <dt className="text-ink/60">Guest</dt><dd>{view.row.guest_name}</dd>
              <dt className="text-ink/60">Check-in</dt><dd>{formatLongDate(view.row.check_in)}</dd>
              <dt className="text-ink/60">Check-out</dt><dd>{formatLongDate(view.row.check_out)}</dd>
              <dt className="text-ink/60">Total</dt><dd>{formatInr(view.row.total_amount)}</dd>
              <dt className="text-ink/60">Paid</dt><dd>{formatInr(view.row.amount_paid)}</dd>
              <dt className="text-ink/60">Status</dt><dd>{statusLabel(view.row)}</dd>
            </dl>
            {view.row.status === "pending_payment" ? <PayStay row={view.row} /> : null}
            {view.row.invoice_number ? (
              <a className="underline" href={`/invoice/${view.row.id}?t=${t}`} target="_blank" rel="noreferrer">
                View tax invoice {view.row.invoice_number}
              </a>
            ) : null}
            <p className="text-ink/60">{view.policy}</p>
            {view.row.status === "confirmed" || view.row.status === "pending_payment" ? (
              <Button variant="outline" disabled={busy} onClick={cancel}>
                {busy ? "Cancelling…" : view.refundIfCancelled > 0 ? `Cancel and refund ${formatInr(view.refundIfCancelled)}` : "Cancel booking"}
              </Button>
            ) : null}
            {message ? <p role="status">{message}</p> : null}
          </div>
        )}
      </section>
    </PageShell>
  );
}
