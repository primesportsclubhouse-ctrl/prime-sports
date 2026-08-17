# Staff & Admin Guide

This is a plain-language walkthrough of the admin side of the site — no coding knowledge needed.

## Logging in

Go to `/admin` on the site. Only accounts set up as **admin** can sign in right now — if you try to log in with an account that isn't set up this way, you'll see "This account is not authorized for admin access."

Once logged in, you'll land on the **Master Calendar**. If you're not logged in and try to visit any admin page directly, you'll be sent back to the login page automatically.

## The six admin sections

- **Master Calendar** — the day-by-day booking calendar across all courts, showing who's booked, their payment reference, and whether they're still pending or fully confirmed.
- **Availability** — mark specific court/hour slots closed for a date (maintenance, a private tournament, etc.). A blocked slot genuinely can't be booked by anyone — customers see it grayed out on the live booking page immediately.
- **Rate Cards** — set the actual price charged per hour, split by weekday/weekend and daytime/evening. This is the real price used everywhere: the booking page, checkout, and the homepage's rate display all read from what you set here.
- **Verification Queue** — where you approve or reject a customer's submitted payment. The sidebar shows a live badge with the number of submissions currently waiting on you.
- **Roster** — the court-side check-in tool, used when a booking's court time actually starts.
- **Facility Content** — manage what shows up on the public homepage: gallery photos, FAQ questions/answers, the contact/address footer info, and each payment channel's QR code image.

## Verifying a payment

A customer books a court, then submits proof of payment (a reference number and a photo of their receipt). That submission shows up in the **Verification Queue**, and the sidebar badge tells you at a glance how many are waiting.

As soon as a customer submits their reference number, they automatically get an email letting them know it was received and is pending your review — that's separate from the confirmation email below, so they're never left wondering whether their submission actually went through.

Click a submission to see its details and the uploaded receipt. Two buttons:

- **Match & Approve** — confirms the booking is paid. The booking becomes officially confirmed, and the customer automatically gets a second, separate confirmation email with their booking details and a "Check in your group" link (and a text message too, once that feature is turned on — see below).
- **Reject / Cancel Booking** — the booking is cancelled and that time slot immediately becomes available for someone else to book.

These two buttons now do genuinely different things — approving and rejecting used to behave identically by mistake; that's fixed.

## Managing availability & closing slots

On the **Availability** page, pick a date and sport, then click any open court/hour cell to mark it closed (click again to reopen it). This is for maintenance, private events, or anything else that should keep the slot off the public booking grid without actually creating a fake booking. Changes save immediately and take effect on the live site right away — customers see the slot go gray in real time, and the system will genuinely refuse to let anyone book a blocked slot even if they try.

## Setting rates

On the **Rate Cards** page, set four prices: weekday daytime, weekday evening, weekend daytime, weekend evening. Saving updates the price charged everywhere at once — new bookings, the live availability grid, checkout, and the homepage's advertised rates. There's currently one shared rate across all courts (not a different price per individual court).

## Managing facility content

The **Facility Content** page has four tabs:

- **Media** — the photos shown in the homepage's facility gallery. Any card without a real photo uploaded yet shows the club crest instead of a broken image or a stock photo.
- **FAQ** — the questions and answers shown in the homepage's FAQ section. Edit the text directly; changes go live within about a minute (no need to wait for a full site redeploy).
- **Payment Channels** — edit the account name/number shown at checkout for GCash, Maya, and Bank Transfer, and upload a real QR code image for each so customers can scan it directly at checkout instead of seeing a placeholder graphic. (The three payment methods themselves are fixed — this isn't a place to add a brand-new payment method.)
- **Settings** — the facility's address, hours, parking info, and public contact phone/email shown in the homepage footer and location section.

Any edit here appears on the live public site within about a minute — no redeploy needed.

## Running court-side check-in (Roster)

This is the tool for tracking who's actually shown up and is playing, separate from who made the booking.

1. On the **Roster** page, pick the date and the specific booking (court + time) you're opening check-in for.
2. Click to **activate** the session — this is the "the court is open, check-in starts now" signal.
3. From this point, **the customer's group can check themselves in without you doing it player by player.** When you approved their payment, the confirmation email they received included a "Check in your group" link — anyone in their group can open that link on their phone and add their own name to the roster the moment they arrive. You don't need to type in every player's name yourself anymore.
4. You can still add/remove/check in players yourself from this same screen if needed.
5. When the session's over, end it from here.

There's a 10-player cap per court, enforced automatically — nobody (staff or a customer using their check-in link) can add an 11th player.

## What staff actions are tracked

Every payment approval/rejection, every roster session you start or end, and every availability/rate/content/QR edit you make is recorded in an internal activity log (who did it, what it was, when). There's no visible screen for this yet — it exists for accountability and troubleshooting, not day-to-day staff use.

## What's not real yet

- **Text message confirmations** — built and ready, just switched off for now. Customers currently only get emails, not a text, at either stage of the booking flow.
- **Real payment gateway** — payments are still verified manually by staff reviewing a submitted receipt, not processed automatically through a payment provider. This was a deliberate choice, not an oversight.
- **Real scan-to-pay QR codes** — you can upload a real photo of your GCash/Maya/bank QR code (see Facility Content above) and customers will see that actual image, but it's a picture, not a live, generated scan-to-pay code tied to the specific amount owed. Customers still need to enter the amount themselves in their payment app.
- **Per-court pricing** — Rate Cards currently sets one shared price across every court, not a different rate per individual court.
