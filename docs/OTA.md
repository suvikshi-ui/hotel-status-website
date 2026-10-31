# OTAs (MakeMyTrip, FabHotels, Brevistay) and the website

## Where things stand

The website has **no connection** to any OTA. Nothing is synced either way:

- A room booked on the website is **not** closed on MakeMyTrip, FabHotels or Brevistay.
- A room sold on an OTA does **not** reduce website availability.

Until a channel manager or partner API is set up, the owner page has a warning
and a manual **Block dates** tool (`date_blocks`, migration `0007`). Blocked
rooms count toward availability exactly like bookings.

Daily routine for the desk:

1. On every OTA booking, add a block on `/owner` (room type, rooms, first night, check-out day, source).
2. On every website booking (owner email or WhatsApp alert), close that inventory on each OTA extranet.
3. Remove a block if the OTA booking is cancelled.

## Options for real sync

### 1. Channel manager (recommended)

A channel manager holds one inventory and pushes availability and rates to every
OTA, then pulls their bookings back. In India the common ones are
**eZee Centrix / YCS**, **STAAH**, **AxisRooms**, **RateGain**, **SiteMinder**
and **Djubo**. Most cost roughly Rs 1,500 to Rs 5,000 a month per property and connect to
MakeMyTrip/Goibibo and Agoda/Booking.com. FabHotels and Brevistay support varies, so ask each vendor.

What the website would need after that:

- Push our bookings to the channel manager (most have a booking-engine API or a
  ready booking engine). The hook is `onBookingCreated` / `onBookingChanged` in
  `src/lib/booking-events.server.ts`, the same place the front-desk sync runs.
- Pull availability from it, or let it write blocks. A webhook that inserts
  `date_blocks` rows (source = the OTA) fits the current schema without other changes.

### 2. MakeMyTrip / Goibibo (InGo-MMT) connectivity

MakeMyTrip offers the **InGo-MMT Connectivity API** (ARI push: availability, rates, inventory; booking
pull or notification) to **certified connectivity partners**, mainly
channel managers. A single hotel usually can't get direct access. Request it through the
InGo-MMT extranet or the market manager, or go through a channel manager listed as an MMT partner.

### 3. FabHotels

FabHotels is a franchise / marketplace. Inventory is normally managed by the
FabHotels team or their partner app, and there is no public partner API. Ask the
FabHotels account manager whether they accept inventory from a channel manager
or can share an availability feed. Otherwise keep using manual blocks.

### 4. Brevistay

Brevistay sells hourly / short stays and works through its partner (hotelier) app. There is
no public API. Ask the partner team about channel-manager connectivity (some
Indian channel managers list Brevistay). Hourly stays don't fit the
nightly model here. For an hourly sale, block the night if the room can't be resold.

## Decision needed from the owner

- Choose a channel manager, or confirm that manual blocks are the process for now.
- Get API credentials from the chosen vendor. Wiring them in is a small follow-up
  in `booking-events.server.ts` plus a webhook route that writes `date_blocks`.
