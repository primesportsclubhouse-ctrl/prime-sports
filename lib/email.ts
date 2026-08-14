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
      <p>See you on the court!</p>
      <p style="color: #777; font-size: 13px;">— Prime Sports</p>
    </div>
  `.trim();
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
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      outcome: "skipped",
      reason: `Email is not configured — set ${ENV_VAR_NAME} to send booking confirmation emails (see .env.local.example).`,
    };
  }

  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  const subject = `Booking confirmed — ${input.courtName}, ${input.bookingDateLabel}`;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        html: buildBookingConfirmationHtml(input),
      }),
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
