# Customer Booking & Check-In Journey

A plain-language walk-through of what a customer actually experiences, start to finish.

## 1. Browsing & booking

A customer picks a sport (pickleball or badminton), a date, and an available court/time slot. No account or sign-up is needed at any point — the site remembers their in-progress booking on their own device, so refreshing the page or closing the tab and coming back doesn't lose their spot (it's held for them behind the scenes for a short window).

If two people try to grab the exact same court/time at once, only one of them can succeed — the system guarantees no double-booking, even if both people click at nearly the same instant.

## 2. Checkout

At checkout, the customer:
1. Enters their contact details.
2. Picks a payment method (GCash, Maya, or Bank Transfer) and sees the account details to pay to.
3. Uploads a photo of their payment receipt.
4. Enters the reference number from that payment — if it's clearly readable in the photo, the site will try to fill this in for them automatically (it's still editable, so they can correct it if it guessed wrong).
5. Accepts the facility waiver.
6. Submits.

At this point, the booking is **pending** — a real staff member reviews the receipt before it's confirmed. This is a manual step by design, not an automated instant-confirm.

As soon as the customer submits, they immediately get an email confirming their submission was received and is pending review, listing their court(s), date(s)/time(s), and payment reference. This is just an acknowledgment, not the final confirmation — it lets the customer know their submission genuinely went through instead of leaving them guessing.

## 3. Confirmation

Once staff approves the payment, the customer receives a second, separate email confirming their booking — court, date, time, and price. That same email includes a **"Check in your group"** link.

## 4. Arriving & checking in

This link is the customer's own private check-in page for that specific booking. Nobody else can use it for a different booking.

- If staff hasn't opened check-in for that court/time slot yet, the page shows a simple waiting message — it updates on its own the moment staff does.
- Once staff opens it, the booker (and anyone they share the link with) can type in each player's name as they arrive, and everyone is marked "checked in" immediately. No staff member needs to walk down a list and check each person in one at a time.
- There's a maximum of 10 players per court, enforced automatically.

This link doesn't let the customer end the check-in session themselves — only staff can do that, once play is finished.
