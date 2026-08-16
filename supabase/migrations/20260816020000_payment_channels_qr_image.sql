-- Payment channels: admin-editable QR images slice.
--
-- Decision (documented per this slice's own instructions): keep
-- `payment_channel_key` a fixed 3-value enum ('gcash', 'maya',
-- 'bank_transfer') rather than turning `payment_channels.key` into a
-- genuinely addable free-form column. Verified before deciding:
--   * `payment_submissions.channel` (Phase 2 payments migration) is typed
--     against this *same* enum and is written by the live guest checkout
--     flow (checkout-client.tsx -> POST /api/payment-submissions) every time
--     a payment is submitted for verification — it's load-bearing, not just
--     a display value.
--   * lib/payments.ts hardcodes `PaymentChannelKey` as a 3-member TS string
--     union, plus `displayKeyToChannel()` / `channelToDisplayKey()` as
--     static switches mapping checkout-client.tsx's fixed 3 UI tabs
--     ("GCash", "Maya", "Bank Transfer") to exactly these three enum values.
-- Genuinely allowing an admin to add a 4th channel at runtime would also
-- require reworking `payment_submissions.channel` (a column with live rows
-- and a unique index already built around it) and checkout-client.tsx's
-- fixed-3-tab rendering/submission logic — both well beyond what was asked
-- for here ("upload/set the real QR images the business already has"). So
-- this slice is "edit the existing 3 channels' details and QR image", not
-- "add new channels at runtime" — a genuine 4th channel remains a future
-- migration + code change, same as the seed migration's own comment already
-- implied for account details.

alter table payment_channels
  add column qr_image_path text;

comment on column payment_channels.qr_image_path is
  'Object path (not a public URL) in the public payment-qr-codes Storage bucket for this channel''s real GCash/Maya/bank QR image, set by a manager/admin via /admin/content > Payment Channels. Null until a real image has been uploaded — qr-code-card.tsx falls back to the decorative placeholder render until then.';

-- ---------------------------------------------------------------------------
-- Storage: payment QR code images
-- ---------------------------------------------------------------------------

-- Public bucket — unlike the private `receipts` bucket, customers need to
-- actually see these at checkout, so the object's public URL has to resolve
-- directly without a signed-URL round trip. Uploads/replacements still only
-- ever go through the manager/admin-gated Route Handler using the
-- service-role client (see /api/payment-channels/[key]/qr-image), so there
-- is deliberately no anon/authenticated INSERT/UPDATE/DELETE policy on this
-- bucket. The explicit SELECT policy below is a defensive belt-and-suspenders
-- alongside the bucket's own `public = true` flag (which already serves
-- reads via the `/storage/v1/object/public/...` endpoint without consulting
-- RLS at all) — cheap to add, and keeps this bucket's access model legible
-- from the migration alone rather than depending solely on the flag.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-qr-codes', 'payment-qr-codes', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy payment_qr_codes_public_read on storage.objects
  for select
  using (bucket_id = 'payment-qr-codes');
