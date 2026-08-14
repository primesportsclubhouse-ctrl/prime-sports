-- Phase 3 slice 1: Supabase Realtime for live availability + the staff
-- verification queue.
--
-- Two different consumers, two different authorization stories:
--
-- 1. Staff (`verification-queue.tsx`) subscribe to `payment_submissions` over
--    an *authenticated* browser session (the same Supabase Auth session
--    `@supabase/ssr` already shares between server Route Handlers and the
--    browser client via readable cookies). `payment_submissions_staff_all`
--    from the Phase 2 payments migration already grants `is_staff()` full
--    SELECT — Realtime enforces the same RLS policies as PostgREST, so no
--    schema change is needed there at all.
--
-- 2. Guests browsing the booking calendar (`booking-client.tsx`) subscribe as
--    the anonymous role — there is no session to be staff under. Today
--    `bookings` and `slot_holds` are staff-only (`bookings_staff_all` /
--    `slot_holds_staff_all`), so an anon Realtime subscription would receive
--    nothing at all: Realtime evaluates a row against the subscribing role's
--    SELECT policies before delivering any event for it. Making the booking
--    grid live therefore requires *some* anon-visible slice of these tables.
--
--    Rather than opening a blanket "anon can read all of bookings/slot_holds"
--    policy (which would newly expose customer_id/price_php and, worse on
--    slot_holds, the bearer-token-equivalent `session_token` guest checkout
--    already relies on for ownership proof — see the Phase 2 slot_holds
--    migration), this grants anon SELECT on exactly the columns
--    /api/availability already computes and returns to anyone unauthenticated
--    today: which (court, date, time) slots are open/held/booked. Nothing
--    beyond that shape is exposed. Column-level privileges (`grant select
--    (col, col) on ... to anon`) are what make this possible — RLS alone only
--    controls *rows*, not columns, so the `using (true)` policies below would
--    otherwise still hand anon the full row (session_token included) once
--    Supabase's baseline blanket per-table grant is what's actually gating
--    column visibility.
--
-- Neither table gets `replica identity full`. Realtime's payload for
-- INSERT/UPDATE already contains the full new row (subject to the RLS/column
-- grants above); replica identity only changes what the *old* row looks like
-- on UPDATE/DELETE, and every consumer here only treats an event as a "go
-- refetch /api/availability or /api/payment-submissions" signal, never reads
-- old-vs-new field diffs out of the payload. The default primary-key-only
-- identity is sufficient — switching to `full` would just add row-image
-- overhead to WAL for no consumer that needs it.

revoke select on bookings from anon;
grant select (court_id, booking_date, time_slot, status) on bookings to anon;

create policy bookings_public_read_availability on bookings for select to anon using (true);

revoke select on slot_holds from anon;
grant select (court_id, booking_date, time_slot, expires_at) on slot_holds to anon;

create policy slot_holds_public_read_availability on slot_holds for select to anon using (true);

-- ---------------------------------------------------------------------------
-- Realtime publication membership
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table slot_holds;
alter publication supabase_realtime add table payment_submissions;
