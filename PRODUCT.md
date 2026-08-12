# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three groups book and use courts at PrimeSports Clubhouse:

- **Casual players/groups** — reserve a single court for pickleball or badminton play.
- **Leagues & tournament organizers** — book court blocks and run check-in for a roster of players they bring.
- **Coaches/training clients** — book court time specifically for lessons or training sessions.

The roster/check-in tool treats "Organizer" as a distinct role from the booking customer: whoever activates a court session and checks players in is not necessarily the person who made the reservation.

## Product Purpose

A reservation platform for PrimeSports Clubhouse, a physical pickleball/badminton facility. It lets customers browse court availability, reserve a slot, pay through local channels, and arrive with a confirmed booking; it lets staff run the booking calendar, verify payments, and manage court-side attendance from an admin dashboard. Success is a customer who reserves, pays, and shows up without friction, and staff who can trust the calendar and payment queue reflect reality.

## Positioning

The facility itself is the differentiator: covered and open-air courts, dedicated training space, and a members' lounge make it a nicer venue than nearby alternatives — not the cheapest or the only option in the area. Surface work should let the physical space sell itself rather than leaning on price or scarcity claims.

## Operating Context

- Single clubhouse: Highway, Minglanilla, Cebu, 6064. Open daily, 6:00 AM – 2:00 AM (last slot starts 1:00 AM).
- Courts: 7 pickleball courts, 4 badminton courts. Same operating hours and rate schedule across both sports; only the court roster differs.
- Rates: separate weekday/weekend tiers, each split into a daytime window (6:00 AM–4:00 PM) and nighttime window (4:00 PM–2:00 AM). `lib/prime-sports.ts` is the single source of truth the homepage pricing cards and booking flow both read from — rates must never drift apart between the two.
- Payment channels: GCash, Maya, Bank Transfer — scan-to-pay plus a receipt/reference the customer submits at checkout.
- Booking flow: browse availability → reserve a slot → checkout (payment submission) → waiver acceptance → QR-coded confirmation.
- Staff/admin flow: master booking calendar (all courts, one day at a time), a payment-verification queue (approve/reject submitted receipts), and a roster/check-in tool per court session (10-player capacity, organizer activates the session and checks players in).
- Booking reference format: `PRS-XXXXXX`.

## Capabilities and Constraints

**Confirmed functionality:** hourly-slot booking across pickleball/badminton courts; weekday/weekend + daytime/nighttime rate tiers; a checkout step that captures a payment submission for manual staff review; a waiver-acceptance step; a QR code issued on confirmation; a roster/check-in tool with a 10-player cap per court and an organizer role separate from the booking customer; an admin dashboard covering the calendar and the verification queue.

**Current stage — pre-launch, backend is entirely mocked.** No live bookings run through this platform yet; the business is getting ready to launch it. Per `backend_database_checklist.md`, this is durable status future work must not paper over by treating placeholder behavior as production behavior:

- No real database/persistence — schema exists as a Supabase migration (`supabase/migrations/`) but the app doesn't read/write it yet.
- No real staff authentication; `/admin/*` isn't actually gated.
- The payment approve/reject action has a known bug — approve and reject currently transition to the same state.
- QR codes are generated pixel patterns, not real encoded payment/booking data.
- Roster player names are randomly generated placeholders, not real check-ins.
- Receipt upload, OCR reference extraction, and a real payment gateway (PayMongo/Xendit) are not yet built — verification is fully manual today by design, pending that phase.
- The 4-step booking flow doesn't yet persist a draft booking server-side, so state can be lost across steps.

## Brand Commitments

- Name: **PrimeSports Clubhouse**.
- Typography hierarchy is already established and confirmed in `AGENTS.md` — Montserrat for primary headers, Plus Jakarta Sans for body/inputs, JetBrains Mono for numerics/pricing/time slots, Instrument Serif for editorial accents. Treat as settled; do not reopen without cause.

## Evidence on Hand

- Real address and hours: Highway, Minglanilla, Cebu, 6064; open daily 6:00 AM–2:00 AM. Real Google Maps location embedded on the homepage.
- No real FAQ answers, testimonials, facility photography, or case studies exist yet — all placeholder bracketed text in code (`[FAQ question 01 — ...]`, admin queue names like `[Rivera, M.]`, etc.). Future work must not invent real-sounding content here; either keep placeholders honestly marked or get real content from the client.

## Product Principles

1. `lib/prime-sports.ts`'s rate table and court roster are the single source of truth — pricing and court counts must never drift between marketing pages and the booking flow.
2. Payment trust is manual-first today: staff review submitted receipts. Verification state (pending/approved/rejected) must stay legible to both customer and staff until a real gateway replaces manual review.
3. The booking customer and the on-court organizer are distinct roles wherever roster/check-in appears — don't collapse them.
4. The facility's physical quality (covered/open-air courts, training space, lounge) is the sales argument — design and copy should showcase the venue, not compete on price or urgency.
5. This is pre-launch software: don't present mocked data (fake QR codes, random roster names, placeholder FAQ/testimonials) as if it were real content or a shipped capability.