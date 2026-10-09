import { createFileRoute } from "@tanstack/react-router";
import { markPaidIfAmount, webhookSignature } from "@/lib/razorpay.server";

export const Route = createFileRoute("/api/razorpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (!webhookSignature(raw, request.headers.get("x-razorpay-signature"))) {
          return new Response("invalid signature", { status: 400 });
        }
        let event: {
          event?: string;
          payload?: {
            payment_link?: { entity?: { reference_id?: string; amount_paid?: number } };
            payment?: { entity?: { id?: string; amount?: number } };
          };
        };
        try {
          event = JSON.parse(raw) as typeof event;
        } catch {
          return new Response("invalid json", { status: 400 });
        }
        if (event.event === "payment_link.paid") {
          const reference = event.payload?.payment_link?.entity?.reference_id ?? "";
          const amount = event.payload?.payment?.entity?.amount ?? event.payload?.payment_link?.entity?.amount_paid;
          const paymentId = event.payload?.payment?.entity?.id ?? null;
          if (/^HSR-\d{6}$/.test(reference) && typeof amount === "number") {
            await markPaidIfAmount(reference, amount, paymentId);
          }
        }
        return new Response("ok");
      },
    },
  },
});
