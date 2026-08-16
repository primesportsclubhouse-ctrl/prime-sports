# Staff & Admin Guide

This is a plain-language walkthrough of the admin side of the site — no coding knowledge needed.

## Logging in

Go to `/admin` on the site. Only accounts set up as **admin** can sign in right now — if you try to log in with an account that isn't set up this way, you'll see "This account is not authorized for admin access."

Once logged in, you'll land on the **Master Calendar**. If you're not logged in and try to visit any admin page directly, you'll be sent back to the login page automatically.

## The four admin sections

- **Master Calendar** — the day-by-day booking calendar across all courts.
- **Availability** — where court rates and open hours are meant to be managed. **Heads up: this page doesn't actually save changes yet** — it's a working screen, but anything you change here doesn't persist. Don't rely on it until this is flagged as fixed.
- **Verification Queue** — where you approve or reject a customer's submitted payment.
- **Roster** — the court-side check-in tool, used when a booking's court time actually starts.

## Verifying a payment

A customer books a court, then submits proof of payment (a reference number and a photo of their receipt). That submission shows up in the **Verification Queue**.

Click a submission to see its details and the uploaded receipt. Two buttons:

- **Match & Approve** — confirms the booking is paid. The booking becomes officially confirmed, and the customer automatically gets a confirmation email (and a text message too, once that feature is turned on — see below).
- **Reject / Cancel Booking** — the booking is cancelled and that time slot immediately becomes available for someone else to book.

These two buttons now do genuinely different things — approving and rejecting used to behave identically by mistake; that's fixed.

## Running court-side check-in (Roster)

This is the tool for tracking who's actually shown up and is playing, separate from who made the booking.

1. On the **Roster** page, pick the date and the specific booking (court + time) you're opening check-in for.
2. Click to **activate** the session — this is the "the court is open, check-in starts now" signal.
3. From this point, **the customer's group can check themselves in without you doing it player by player.** When you approved their payment, the confirmation email they received included a "Check in your group" link — anyone in their group can open that link on their phone and add their own name to the roster the moment they arrive. You don't need to type in every player's name yourself anymore.
4. You can still add/remove/check in players yourself from this same screen if needed.
5. When the session's over, end it from here.

There's a 10-player cap per court, enforced automatically — nobody (staff or a customer using their check-in link) can add an 11th player.

## What staff actions are tracked

Every payment approval/rejection, and every roster session you start or end, is recorded in an internal activity log (who did it, what it was, when). There's no visible screen for this yet — it exists for accountability and troubleshooting, not day-to-day staff use.

## What's not real yet

- **Availability/rate editing** — the screen exists but doesn't save (see above).
- **Text message confirmations** — built and ready, just switched off for now. Customers currently only get an email, not a text, when their payment is approved.
- **Real payment gateway / scannable QR codes** — payments are still verified manually by staff reviewing a submitted receipt; the QR shown at checkout is decorative, not a real scan-to-pay code. This was a deliberate choice, not an oversight.
