import { createFileRoute } from "@tanstack/react-router";
import { markPaid, paymentLinkSignature } from "@/lib/razorpay.server";

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
          await markPaid(reference, url.searchParams.get("razorpay_payment_id"));
        }
        const dest = ok ? `/bookings?paid=${encodeURIComponent(reference)}` : "/bookings?paid=0";
        return new Response(null, { status: 302, headers: { Location: dest, "Cache-Control": "no-store" } });
      },
    },
  },
});
