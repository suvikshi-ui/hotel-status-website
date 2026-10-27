import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/refund")({
  head: () => ({ meta: [{ title: "Refund & Cancellation Policy | Hotel Status Residency" }] }),
  component: () => (
    <LegalPage title="Refund & Cancellation Policy">
      <h2>Check-in time</h2>
      <p>Check-in is at 12:00 noon IST on the arrival date. All cancellation windows below are counted back from that time.</p>
      <h2>Cancelling a booking</h2>
      <ul>
        <li>You can cancel yourself using the manage link in your booking confirmation, or by emailing us.</li>
        <li><strong>Full refund</strong> when you cancel more than 24 hours before 12:00 noon IST on the check-in date.</li>
        <li><strong>No refund</strong> when you cancel 24 hours or less before check-in, or do not arrive (no-show).</li>
      </ul>
      <h2>How refunds are paid</h2>
      <ul>
        <li>Online payments are refunded through Razorpay to the original payment method (card, UPI, net banking or wallet).</li>
        <li>Refunds are started at the time of cancellation and usually reach your account in 5–7 business days, depending on your bank.</li>
        <li>The refund is calculated on the amount actually paid online, including any 30% advance.</li>
        <li>Amounts paid at the hotel desk are refunded at the desk, not through Razorpay.</li>
      </ul>
      <h2>Payment options</h2>
      <ul>
        <li><strong>Pay in full</strong> online when booking.</li>
        <li><strong>Pay a 30% advance</strong> online and the balance at the hotel.</li>
        <li><strong>Pay at hotel</strong>, with nothing charged online.</li>
      </ul>
      <h2>Unpaid bookings</h2>
      <p>A booking that needs online payment is held for 30 minutes. If payment is not completed in that time, the hold is released automatically, the room goes back on sale, and nothing is charged.</p>
      <h2>Prices and GST</h2>
      <p>All room prices include 5% GST. A GST invoice is available for every booking.</p>
    </LegalPage>
  ),
});
