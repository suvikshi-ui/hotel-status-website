import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getInvoice, type InvoiceView } from "@/lib/bookings.functions";
import { ROOM_LABELS } from "@/lib/booking-labels";

export const Route = createFileRoute("/invoice/$id")({
  validateSearch: (search: Record<string, unknown>): { t?: string } => ({
    t: typeof search.t === "string" ? search.t : undefined,
  }),
  component: InvoicePage,
  head: () => ({ meta: [{ title: "Tax invoice · Hotel Status Residency" }, { name: "robots", content: "noindex" }] }),
});

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function InvoicePage() {
  const { id } = Route.useParams();
  const { t } = Route.useSearch();
  const [inv, setInv] = useState<InvoiceView | null | undefined>(undefined);

  useEffect(() => {
    if (!t) return setInv(null);
    getInvoice({ data: { id, token: t } }).then(setInv, () => setInv(null));
  }, [id, t]);

  if (inv === undefined) return <p className="p-10 text-sm">Loading…</p>;
  if (inv === null) return <p className="p-10 text-sm">No invoice is available for this link yet.</p>;
  const { row, gst } = inv;
  const half = gst.gstPercent / 2;

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 text-sm text-black print:p-0">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{inv.hotel.name}</h1>
          <p className="whitespace-pre-line">{inv.hotel.address}</p>
          <p>{inv.hotel.phones.join(" / ")} · {inv.hotel.email}</p>
          <p>GSTIN: {inv.gstin ?? "—"}</p>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-semibold">TAX INVOICE</h2>
          <p>No. {row.invoice_number}</p>
          <p>Date: {(row.invoiced_at ?? row.created_at).slice(0, 10)}</p>
          <p>Booking: {row.id}</p>
        </div>
      </div>
      <p className="mb-4">
        Billed to: <strong>{row.guest_name}</strong> · {row.phone} · {row.email}
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y text-left">
            <th className="py-2">Description</th>
            <th className="py-2">SAC</th>
            <th className="py-2 text-right">Taxable value</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-2">
              Room tariff: {ROOM_LABELS[row.room_type] ?? row.room_type} × {row.rooms}, {inv.nights} night(s), {row.check_in} to {row.check_out}
            </td>
            <td className="py-2">996311</td>
            <td className="py-2 text-right">{inr(gst.taxable)}</td>
          </tr>
          <tr><td colSpan={2} className="py-1 text-right">CGST @ {half}%</td><td className="py-1 text-right">{inr(gst.cgst)}</td></tr>
          <tr><td colSpan={2} className="py-1 text-right">SGST @ {half}%</td><td className="py-1 text-right">{inr(gst.sgst)}</td></tr>
          <tr className="border-t font-semibold"><td colSpan={2} className="py-2 text-right">Total</td><td className="py-2 text-right">{inr(gst.total)}</td></tr>
          <tr><td colSpan={2} className="py-1 text-right">Paid</td><td className="py-1 text-right">{inr(row.amount_paid)}</td></tr>
          <tr><td colSpan={2} className="py-1 text-right">Balance</td><td className="py-1 text-right">{inr(Math.max(0, gst.total - row.amount_paid))}</td></tr>
        </tbody>
      </table>
      <p className="mt-6 text-xs">GST on accommodation at a flat {gst.gstPercent}%. This is a computer-generated invoice.</p>
      <button type="button" onClick={() => window.print()} className="mt-6 border px-4 py-2 print:hidden">
        Print
      </button>
    </main>
  );
}
