# Booking flow: setup checklist before merging `booking-flow-fixes`

## 1. Apply these migrations to the production Neon database first, in order

`npm run build` runs `scripts/migrate.mjs` whenever `DATABASE_URL` is set, so a
production deploy applies them automatically. Preview builds skip it
(`VERCEL_ENV` is not `production`). Apply them by hand, or merge in a quiet hour,
**after taking a Neon branch/backup**:

| File | What it does |
| --- | --- |
| `migrations/0004_room_inventory.sql` | `room_inventory` (deluxe 8, super-deluxe 6, suite 4: **confirm the real split** and update the rows), per-room-type capacity in `place_booking` |
| `migrations/0005_payment_modes.sql` | `pending_payment` / `expired` statuses, payment modes, `amount_paid`, holds, `record_payment()` |
| `migrations/0006_cancel_refund_invoice.sql` | `manage_token` (guest self-cancel link), refund columns, `invoice_counters` and the auto invoice number trigger (`HSR/2026-27/0001`) |
| `migrations/0007_date_blocks.sql` | `date_blocks` (manual OTA/maintenance blocks) counted by `rooms_taken()` |

All of them are idempotent (`if not exists` / `create or replace`).

The front desk app (`hotel-status-residency`) needs
`supabase/migrations/0018_website_bookings.sql` run in its Supabase SQL editor (separate PR).

## 2. Environment variables (Vercel → Production)

Existing, unchanged: `DATABASE_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `WHATSAPP_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE`, `BETTER_AUTH_URL`.

New (all optional; defaults shown):

| Variable | Default | Meaning |
| --- | --- | --- |
| `SITE_URL` | `https://www.hotelstatusresidency.com` | Base for links in messages and Razorpay callbacks |
| `ADVANCE_PERCENT` | `30` | Advance share for the "pay advance" option |
| `PAYMENT_HOLD_MINUTES` | `30` | How long an unpaid online booking holds rooms (min 15) |
| `PAY_AT_HOTEL_ENABLED` | on (`false` turns it off) | Offer "pay at hotel" |
| `CANCEL_FULL_REFUND_HOURS` | `24` | Full refund if cancelled more than this many hours before check-in |
| `CANCEL_LATE_REFUND_PERCENT` | `0` | Refund % for later cancellations |
| `CHECKIN_HOUR` | `12` | Check-in hour (IST) the policy counts back from |
| `GST_PERCENT` | `5` | Flat GST on room tariff. No slab, no Rs 7,500 threshold |
| `PRICES_INCLUDE_GST` | true (`false` adds GST on top) | Whether listed prices already include GST |
| `HOTEL_GSTIN` | none | Printed on invoices (shows "—" when unset) |
| `WHATSAPP_GUEST_BOOKING_TEMPLATE` | `guest_booking_received` | Guest booking message template |
| `WHATSAPP_GUEST_RECEIPT_TEMPLATE` | `guest_payment_receipt` | Guest receipt template |
| `FRONTDESK_SUPABASE_URL` | none | Status Ledger Supabase URL (front desk sync) |
| `FRONTDESK_SUPABASE_SERVICE_KEY` | none | Its service-role key (server only, never `VITE_`) |

Every integration is a silent no-op when its keys are missing.

## 3. WhatsApp templates to register (Meta → WhatsApp Manager, category Utility, language en)

`guest_booking_received`, with 7 body params:
`Dear {{1}}, we have your booking {{2}}: {{3}}, {{4}} to {{5}}, total {{6}}. {{7}}`

`guest_payment_receipt`, with 4 body params:
`Dear {{1}}, payment received for booking {{2}}: {{3}}. Balance at the hotel: {{4}}. Thank you.`

If a template isn't approved yet, the helper falls back to a plain text
message, which WhatsApp only delivers inside a 24-hour customer window. Email always
carries the full details.

## 4. Flow summary

- **Availability** is counted per room type: bookings (confirmed, or pending with a live hold) plus `date_blocks`, against `room_inventory`.
- **Pay online in full / pay an advance**: the booking is `pending_payment` with a Razorpay link that expires with the hold. The webhook or callback calls `record_payment` → `confirmed`, `paid` or `partial`, and stores `amount_paid`. The balance shows on the owner page, with a "Balance collected at desk" button.
- **Pay at hotel**: `confirmed` straight away, `payment_status = pay_at_hotel`.
- **Messages**: the guest gets email + WhatsApp on booking, and a receipt on payment. The owner is alerted as before, plus on payment.
- **Front desk**: confirmed bookings (and later changes) are upserted into `website_bookings` in the Status Ledger Supabase.
- **Cancel**: a guest cancels via `/manage/<id>?t=<token>` (in every message) or `/bookings`. The refund follows the policy and goes through the Razorpay Refunds API. Owner cancels refund everything paid online. A failed refund emails the owner to refund by hand.
- **Invoice**: the number is assigned on the first money received, sequential per financial year. The printable page is `/invoice/<id>?t=<token>` (also linked on the owner page).

## Known limits

- A payment that arrives after the hold expired still confirms the booking (the guest paid), which can overbook if the room was resold in between. The owner gets the payment alert. Check for clashes.
- Vercel preview deployments use the production `DATABASE_URL` at runtime. Until the migrations are applied, the preview's booking pages will error (old schema). Use a Neon branch for previews if you want to test them.
- OTA sync is manual (see `docs/OTA.md`).
