Phase 1 — Core Auth & Data Schema

 Stand up database (Postgres recommended, e.g. via Supabase for built-in auth+RLS+storage+realtime in one)
 Create schema: customers, staff_accounts, courts, rate_cards, operating_hours, bookings, slot_holds, payment_submissions, payment_channels, waiver_versions, waiver_acceptances, roster_sessions, roster_entries, facility_media, faq_items, facility_settings
 Real staff auth (hash + session, or Supabase Auth) + middleware.ts gating /admin/*
 Seed real content for facility_media, faq_items, facility_settings, rate_cards to replace bracketed placeholders
Phase 2 — Core CRUD APIs

 /api/availability + /api/bookings with the composite unique index enforcing no double-booking
 /api/payment-submissions + approve/reject actions that actually transition bookings.status (fixing the current approve==reject bug)
 Receipt upload → object storage, wired into checkout
  Waiver acceptance persisted against the booking (waiver_acceptances)
 Roster session/entries CRUD replacing the fake-random-name local array
 Wire the 4-step booking flow to a single server-side draft booking (closes the state-loss gap)
Phase 3 — Real-time & Advanced Logic

 Real-time availability + verification-queue subscriptions
 Real OCR integration for receipt reference extraction
 Real payment gateway (PayMongo/Xendit) to reduce/eliminate manual verification
 Real QR generation encoding actual payment URIs
 Email/SMS confirmation on booking + payment approval
 admin_audit_log for staff actions (approve/reject/edit content)
 Slot-hold TTL sweep (cron or DB trigger) to release abandoned holds