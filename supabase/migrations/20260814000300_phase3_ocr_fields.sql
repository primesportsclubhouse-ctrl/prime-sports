-- Phase 3 slice: real receipt OCR (Google Cloud Vision TEXT_DETECTION) via
-- app/api/ocr/receipt/route.ts. This migration only adds a provenance column
-- to payment_submissions — no schema changes to slot_holds/bookings/etc.
--
-- Why reference_source: staff verifying a payment_submissions row in the
-- queue (Phase 2's verification-queue.tsx) currently have no way to tell
-- whether `reference_no` came from the customer typing it in or from OCR
-- reading it off the uploaded receipt image. That distinction is genuinely
-- useful triage signal — an OCR-extracted-then-unedited reference is exactly
-- what's printed on the receipt image staff already have open, so it's lower
-- risk of a typo/transcription error than a manually-typed one, and it's a
-- useful denominator later for judging how well the Vision integration is
-- actually performing in the field. It is not used to bypass any manual
-- verification step — every submission still goes through the same
-- approve/reject queue regardless of source.
alter table payment_submissions
  add column reference_source text not null default 'manual'
    check (reference_source in ('manual', 'ocr'));
