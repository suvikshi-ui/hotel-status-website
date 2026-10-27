import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LEGAL } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service | Hotel Status Residency" }] }),
  component: () => (
    <LegalPage title="Terms of Service">
      <p>These terms apply to bookings made on hotelstatusresidency.com for {LEGAL.name}, {LEGAL.address} (GSTIN {LEGAL.gstin}). By booking you agree to them.</p>
      <h2>Bookings</h2>
      <ul>
        <li>A booking is confirmed once it is placed and, where online payment is chosen, payment is completed. Confirmations are sent by email and WhatsApp.</li>
        <li>Rooms are subject to availability. Bookings needing online payment are held for 30 minutes and released if unpaid.</li>
        <li>Check-in is at 12:00 noon IST. Guests must present valid government photo ID at check-in.</li>
        <li>Please give accurate name, phone and email details; we use them to contact you about your stay.</li>
      </ul>
      <h2>Prices and payment</h2>
      <ul>
        <li>All prices are in Indian Rupees and include 5% GST.</li>
        <li>You may pay in full online, pay a 30% advance online with the balance at the hotel, or pay at the hotel.</li>
        <li>Online payments are processed securely by Razorpay.</li>
      </ul>
      <h2>Cancellations and refunds</h2>
      <p>See our <Link to="/refund" className="underline">Refund &amp; Cancellation Policy</Link>. You can cancel through the manage link in your confirmation.</p>
      <h2>Conduct</h2>
      <p>Guests are responsible for any damage they cause to hotel property. The hotel may refuse or end a stay for unlawful or unsafe conduct.</p>
      <h2>Liability</h2>
      <p>To the extent allowed by law, the hotel is not liable for indirect losses or for valuables not deposited with the front desk.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India, with courts in Navi Mumbai, Maharashtra having jurisdiction.</p>
    </LegalPage>
  ),
});
