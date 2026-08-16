-- Seeds `facility_media`, `faq_items`, and `facility_settings` with today's
-- REAL current content, exactly as it exists in code right now:
--   * the 6 facility card titles/descriptions from facility-showcase.tsx,
--     with src = null (every card's `media` is commented out today — no real
--     photography exists yet, so this preserves the crest-fallback exactly);
--   * the actual current bracketed-placeholder FAQ text from
--     app/(public)/page.tsx, verbatim — these are not real answers, and
--     writing real ones is a business content decision, not this migration's
--     to make;
--   * the real address/hours from location-panel.tsx, plus null/empty for
--     the fields that don't exist anywhere in the app yet (contact_phone,
--     contact_email, parking_*, landmark_note) — site-footer.tsx's
--     `[Contact]` spot is a literal un-filled placeholder today, so seeding
--     a fabricated phone number here would be less accurate than leaving it
--     null.

insert into facility_media (slug, title, description, media_type, src, alt, meta, sort_order) values
  ('pickeball-courts', 'Pickleball Courts', 'International Standard Silica Sand Surfaces', 'image', null, null, '7 courts', 0),
  ('badminton-courts', 'Badminton Courts', 'International Standard Taraflex Surfaces', 'image', null, null, '4 courts', 1),
  ('players-lounge', 'Players'' Lounge (AC)', 'Comfortable seating for players waiting on the next slot.', 'image', null, null, null, 2),
  ('multi-purpose-area', 'Multi-Purpose Area', 'Open space for warm-ups and footwork drills sessions between games.', 'image', null, null, null, 3),
  ('food-park', 'Food Park', 'Refreshments and light meals for players and visitors.', 'image', null, null, null, 4),
  ('toilet-shower-room', 'AC Toilet & Shower Room', 'Clean and well-maintained facilities for player convenience.', 'image', null, null, null, 5);

insert into faq_items (question, answer, category, sort_order) values
  (
    '[FAQ question 01 — reservations & booking policy]',
    '[FAQ answer 01 — fill in club policy on reservations, lead time, and modifications.]',
    'Booking',
    0
  ),
  (
    '[FAQ question 02 — payment & scan-to-pay checkout]',
    '[FAQ answer 02 — fill in accepted channels (GCash, Maya, Bank), receipt upload, and reference validation flow.]',
    'Payment',
    1
  ),
  (
    '[FAQ question 03 — cancellation & refund window]',
    '[FAQ answer 03 — fill in cancellation cutoff, refund processing time, and reschedule policy.]',
    'Refunds',
    2
  ),
  (
    '[FAQ question 04 — guest access & player cap]',
    '[FAQ answer 04 — fill in 10-player cap per court, guest passes, and membership requirements.]',
    'Access',
    3
  ),
  (
    '[FAQ question 05 — covered vs. outdoor & weather policy]',
    '[FAQ answer 05 — fill in surface differences, rain policy for outdoor courts, and covered-court availability.]',
    'Courts',
    4
  );

insert into facility_settings (
  id, address_line, address_area, hours_value, hours_note,
  parking_slots, parking_note, landmark_note, contact_phone, contact_email
) values (
  true,
  'Highway, Minglanilla',
  'Cebu, 6064',
  '6:00 AM – 2:00 AM',
  'Open daily · Last slot starts 1:00 AM',
  null,
  null,
  null,
  null,
  null
)
on conflict (id) do nothing;
