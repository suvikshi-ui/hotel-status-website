import { createFileRoute } from "@tanstack/react-router";
import { recordPaymentIfAmount, paymentLinkSignature } from "@/lib/razorpay.server";

async function linkAmountPaise(id: string): Promise<number> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql.query<{ amount_due_now: number }>(`select amount_due_now from bookings where id = $1`, [id]);
  return (rows[0]?.amount_due_now ?? -1) * 100;
}

export const Route = createFileRoute("/api/razorpay/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const reference = url.searchParams.get("razorpay_payment_link_reference_id") ?? "";
        const status = url.searchParams.get("razorpay_payment_link_status") ?? "";
        const ok =
          status === "paid" &&
          /^HSR-\d{6}$/.test(reference) &&
          paymentLinkSignature({
            linkId: url.searchParams.get("razorpay_payment_link_id") ?? "",
            referenceId: reference,
            status,
            paymentId: url.searchParams.get("razorpay_payment_id") ?? "",
            signature: url.searchParams.get("razorpay_signature") ?? "",
          });
        if (ok) {
          // The callback carries no amount; trust the link (signed) for the amount it was created with.
          await recordPaymentIfAmount(reference, await linkAmountPaise(reference), url.searchParams.get("razorpay_payment_id"));
        }
        const dest = ok ? `/bookings?paid=${encodeURIComponent(reference)}` : "/bookings?paid=0";
        return new Response(null, { status: 302, headers: { Location: dest, "Cache-Control": "no-store" } });
      },
    },
  },
});
