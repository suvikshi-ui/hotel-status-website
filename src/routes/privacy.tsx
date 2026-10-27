import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy | Hotel Status Residency" }] }),
  component: () => (
    <LegalPage title="Privacy Policy">
      <h2>What we collect</h2>
      <ul>
        <li>Your name, phone number and email address.</li>
        <li>Booking details: room type, dates, number of guests and rooms, amounts and payment status.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To take and manage your booking and run your stay.</li>
        <li>To send booking confirmations, payment receipts and updates by email and WhatsApp.</li>
        <li>To issue GST invoices and meet legal and tax record-keeping duties.</li>
      </ul>
      <h2>Payments</h2>
      <p>Online payments are handled by Razorpay. Card, UPI and bank details are entered on Razorpay and are never stored on our website; we only keep the payment reference and amount.</p>
      <h2>Sharing</h2>
      <p>We do not sell or rent your data. We share it only with the services needed to run bookings (Razorpay for payments, our email and WhatsApp providers for messages, and our hosting provider) or when required by law.</p>
      <h2>Your choices</h2>
      <p>You can ask us to see, correct or delete your data, subject to records we must keep by law, by emailing us.</p>
    </LegalPage>
  ),
});
