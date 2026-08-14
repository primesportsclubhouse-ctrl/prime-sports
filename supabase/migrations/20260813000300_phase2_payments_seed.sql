-- Phase 2 slice 2: seed payment_channels and the initial waiver_versions row.
--
-- payment_channels content is copied verbatim from the `paymentChannels`
-- array literal that used to live in checkout-client.tsx — this migration
-- replaces that array, not its (still-placeholder) content. Real GCash/Maya/
-- bank account details are business information the club has to supply;
-- fabricating realistic-looking account numbers here would just be a new
-- form of mocked data, so the bracketed placeholders are carried over as-is
-- until the actual account details are provided (see AGENTS.md's product
-- principle against presenting mocked content as real — bracketed
-- placeholders are the accepted "still needs real content" signal, a
-- fabricated account number would not be).
insert into payment_channels (key, label, account_name, account_number, qr_payload) values
  ('gcash', 'QR · GCash', '[Account name]', '[Account no.]', null),
  ('maya', 'QR · Maya', '[Account name]', '[Account no.]', null),
  ('bank_transfer', 'QR · Bank', '[Bank name]', '[Account no.]', null);

-- Verbatim copy of the 7-clause waiver body currently hardcoded in
-- waiver-form-dialog.tsx, so the acceptance record this migration's schema
-- supports actually corresponds to what customers see and check the box
-- for. The dialog's own rendering stays untouched (real Phase 2 UI, not a
-- placeholder) — this row exists so acceptances have a real version to
-- reference instead of nothing.
insert into waiver_versions (version_label, body_text, published_at) values (
  'v1',
  $$This Waiver of Liability ("Waiver") is entered into by the individual reserving a court ("Participant") and Prime Sports ("the Club") as a condition of using the Club's courts, equipment, and facilities.

1. Assumption of Risk. Participant acknowledges that racquet and court sports involve inherent risks of physical injury, including but not limited to sprains, fractures, collisions with other players, and falls on court surfaces. Participant voluntarily assumes all such risks arising from participation.

2. Release of Liability. Participant releases, waives, and discharges the Club, its owners, staff, coaches, and affiliates from any and all liability for injury, loss, or damage to person or property, whether caused by negligence or otherwise, to the fullest extent permitted by law.

3. Medical Treatment. In the event of injury during a reservation, Participant authorizes the Club's staff to arrange emergency medical treatment on Participant's behalf. Participant is responsible for all costs associated with such treatment.

4. Facility & Equipment Use. Participant agrees to use courts and equipment only as intended, to follow posted court rules, and to comply with staff instructions at all times. The Club is not responsible for personal belongings left unattended on the premises.

5. Booking Conduct. Reservations are non-transferable. Repeated no-shows or late cancellations may result in suspension of booking privileges. Court time is allocated in fixed hourly slots and cannot be extended if the following slot is reserved by another party.

6. Photo & Video Release. Participant grants the Club permission to use photographs or video captured on the premises during normal operating hours for promotional purposes, unless a written opt-out request has been submitted in advance.

7. Governing Law. This Waiver shall be governed by the laws applicable in the jurisdiction where the Club operates. If any provision of this Waiver is found unenforceable, the remaining provisions shall remain in full effect.

By checking the box below, Participant confirms they have read, understood, and agreed to the terms of this Waiver in full.$$,
  now()
);
