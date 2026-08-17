// Thin wrapper around Resend's REST API for transactional email. No SDK
// dependency needed for the one call shape this app makes (POST /emails) —
// mirrors the "plain fetch, no client library" choice app/api/ocr/receipt/
// route.ts already made for Google Cloud Vision.
//
// To get a RESEND_API_KEY:
//   1. Sign up at https://resend.com.
//   2. Dashboard > API Keys > Create API Key.
// See .env.local.example for the same instructions next to the var.
//
// A verified sending domain (Dashboard > Domains > Add Domain, then add the
// DNS records Resend gives you) is required before Resend will deliver to
// arbitrary recipients — without one, Resend's shared sandbox sender
// (`onboarding@resend.dev`) only delivers to the email address the Resend
// account itself was signed up with. RESEND_FROM_EMAIL overrides the sender
// once a real domain is verified.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const ENV_VAR_NAME = "RESEND_API_KEY";
const DEFAULT_FROM = "Prime Sports <onboarding@resend.dev>";

export type SendEmailResult =
  | { outcome: "sent"; providerMessageId: string }
  | { outcome: "skipped"; reason: string }
  | { outcome: "failed"; reason: string };

export type BookingConfirmationEmailInput = {
  to: string;
  customerName: string;
  courtName: string;
  bookingDateLabel: string;
  timeSlotLabel: string;
  pricePhpLabel: string;
  bookingId: string;
  /** The booker's shareable, booking-scoped roster check-in link — see
   *  approve/route.ts for how it's built (embeds the booking's still-live
   *  slot_holds.session_token). `null` skips the "Check in your group" CTA
   *  below rather than emailing a broken link. */
  rosterCheckinUrl: string | null;
};

export type BookingSubmittedSlot = {
  courtName: string;
  bookingDateLabel: string;
  timeSlotLabel: string;
  pricePhpLabel: string;
};

export type BookingSubmittedEmailInput = {
  to: string;
  customerName: string;
  referenceNo: string;
  slots: BookingSubmittedSlot[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildBookingConfirmationHtml(input: BookingConfirmationEmailInput): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="font-size: 20px; margin-bottom: 8px;">Booking confirmed</h1>
      <p>Hi ${escapeHtml(input.customerName)},</p>
      <p>Your payment has been verified and your booking is now confirmed. Here are the details:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tbody>
          <tr><td style="padding: 4px 0; color: #555;">Court</td><td style="padding: 4px 0; font-weight: 600;">${escapeHtml(input.courtName)}</td></tr>
          <tr><td style="padding: 4px 0; color: #555;">Date</td><td style="padding: 4px 0; font-weight: 600;">${escapeHtml(input.bookingDateLabel)}</td></tr>
          <tr><td style="padding: 4px 0; color: #555;">Time</td><td style="padding: 4px 0; font-weight: 600;">${escapeHtml(input.timeSlotLabel)}</td></tr>
          <tr><td style="padding: 4px 0; color: #555;">Amount</td><td style="padding: 4px 0; font-weight: 600;">${escapeHtml(input.pricePhpLabel)}</td></tr>
        </tbody>
      </table>
      <p style="color: #777; font-size: 13px;">Booking reference: ${escapeHtml(input.bookingId)}</p>
      ${
        input.rosterCheckinUrl
          ? `<p style="margin: 20px 0; text-align: center;">
              <a href="${escapeHtml(input.rosterCheckinUrl)}" style="display: inline-block; background-color: #c8372d; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 24px; border-radius: 8px;">Check in your group</a>
            </p>
            <p style="color: #777; font-size: 13px;">Share this link with your group so everyone can check themselves in when they arrive at the court.</p>`
          : ""
      }
      <p>See you on the court!</p>
      <p style="color: #777; font-size: 13px;">— PrimeSports Clubhouse</p>
    </div>
  `.trim();
}

function buildBookingSubmittedHtml(input: BookingSubmittedEmailInput): string {
  const rows = input.slots
    .map(
      (slot) => `
          <tr>
            <td style="padding: 4px 0; color: #555;">${escapeHtml(slot.courtName)}</td>
            <td style="padding: 4px 0; color: #555;">${escapeHtml(slot.bookingDateLabel)} · ${escapeHtml(slot.timeSlotLabel)}</td>
            <td style="padding: 4px 0; font-weight: 600; text-align: right;">${escapeHtml(slot.pricePhpLabel)}</td>
          </tr>`,
    )
    .join("");

  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="font-size: 20px; margin-bottom: 8px;">We've received your booking</h1>
      <p>Hi ${escapeHtml(input.customerName)},</p>
      <p>Thanks for booking with PrimeSports Clubhouse! We've received your payment reference and your slot${input.slots.length > 1 ? "s are" : " is"} being held while our staff verify it. You'll get a separate email once it's confirmed.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tbody>${rows}</tbody>
      </table>
      <p style="color: #777; font-size: 13px;">Payment reference: ${escapeHtml(input.referenceNo)}</p>
      <p>We'll be in touch shortly — thanks for your patience!</p>
      <p style="color: #777; font-size: 13px;">— PrimeSports Clubhouse</p>
    </div>
  `.trim();
}

/** Shared low-level Resend call — both sendBookingConfirmationEmail (below)
 *  and sendBookingSubmittedEmail funnel through this so the honest-
 *  degradation / error-shape contract only needs to be gotten right once. */
async function sendViaResend(to: string, subject: string, html: string): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      outcome: "skipped",
      reason: `Email is not configured — set ${ENV_VAR_NAME} to send this notification (see .env.local.example).`,
    };
  }

  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    const json = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null;

    if (!response.ok) {
      return {
        outcome: "failed",
        reason: json?.message ?? `Resend responded with ${response.status}.`,
      };
    }

    return { outcome: "sent", providerMessageId: json?.id ?? "" };
  } catch (error) {
    return {
      outcome: "failed",
      reason: error instanceof Error ? error.message : "Resend request failed.",
    };
  }
}

/**
 * Sends a booking-confirmation email via Resend's REST API. Never throws —
 * every failure mode (missing API key, network error, non-2xx response)
 * resolves to a tagged result instead, so callers (see
 * lib/supabase/notifications.ts) can log the outcome without wrapping this
 * in their own try/catch.
 *
 * Honest degradation: with no RESEND_API_KEY set, this returns
 * `{ outcome: "skipped", reason }` — never a fake `{ outcome: "sent" }`.
 */
export async function sendBookingConfirmationEmail(
  input: BookingConfirmationEmailInput,
): Promise<SendEmailResult> {
  const subject = `Booking confirmed — ${input.courtName}, ${input.bookingDateLabel}`;
  return sendViaResend(input.to, subject, buildBookingConfirmationHtml(input));
}

/**
 * Sends the "we've received your booking — pending verification" email —
 * fired right after a guest submits a payment reference for one or more
 * held slots (see POST /api/payment-submissions), distinct from
 * sendBookingConfirmationEmail above (which fires later, only once staff
 * actually approve the submission). Same never-throws / honest-degradation
 * contract as sendBookingConfirmationEmail.
 */
export async function sendBookingSubmittedEmail(
  input: BookingSubmittedEmailInput,
): Promise<SendEmailResult> {
  const subject =
    input.slots.length === 1
      ? `Booking received — ${input.slots[0].courtName}, pending verification`
      : `Booking received — ${input.slots.length} slots, pending verification`;
  return sendViaResend(input.to, subject, buildBookingSubmittedHtml(input));
}
