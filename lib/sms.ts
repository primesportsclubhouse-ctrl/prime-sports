// Thin wrapper around Semaphore's REST API for transactional SMS. Semaphore
// is a Philippines-focused SMS gateway (matches Prime Sports' location) —
// no SDK dependency needed for the one call shape this app makes (POST
// /api/v4/messages), same "plain fetch, no client library" choice
// lib/email.ts (Resend) and app/api/ocr/receipt/route.ts (Google Cloud
// Vision) already made.
//
// To get a SEMAPHORE_API_KEY:
//   1. Sign up at https://semaphore.co.
//   2. Account > API Keys.
// See .env.local.example for the same instructions next to the var.
//
// Semaphore expects PH mobile numbers (e.g. "09171234567" or
// "639171234567") — `customers.phone` is stored as free text from the
// contact-details step, so whatever format the customer typed is passed
// through as-is rather than reformatted here.

const SEMAPHORE_ENDPOINT = "https://api.semaphore.co/api/v4/messages";
const ENV_VAR_NAME = "SEMAPHORE_API_KEY";

export type SendSmsResult =
  | { outcome: "sent"; providerMessageId: string }
  | { outcome: "skipped"; reason: string }
  | { outcome: "failed"; reason: string };

export type BookingConfirmationSmsInput = {
  to: string;
  courtName: string;
  bookingDateLabel: string;
  timeSlotLabel: string;
};

function buildBookingConfirmationMessage(input: BookingConfirmationSmsInput): string {
  return `Prime Sports: Your booking for ${input.courtName} on ${input.bookingDateLabel} at ${input.timeSlotLabel} is confirmed. See you on the court!`;
}

type SemaphoreMessageResponse = { message_id?: number | string; status?: string };
type SemaphoreErrorResponse = Record<string, string[] | string>;

/**
 * Sends a booking-confirmation SMS via Semaphore's REST API. Never throws —
 * every failure mode (missing API key, network error, non-2xx response, or
 * an unexpected response shape) resolves to a tagged result instead, so
 * callers (see lib/supabase/notifications.ts) can log the outcome without
 * wrapping this in their own try/catch.
 *
 * Honest degradation: with no SEMAPHORE_API_KEY set, this returns
 * `{ outcome: "skipped", reason }` — never a fake `{ outcome: "sent" }`.
 */
export async function sendBookingConfirmationSms(
  input: BookingConfirmationSmsInput,
): Promise<SendSmsResult> {
  const apiKey = process.env.SEMAPHORE_API_KEY;

  if (!apiKey) {
    return {
      outcome: "skipped",
      reason: `SMS is not configured — set ${ENV_VAR_NAME} to send booking confirmation texts (see .env.local.example).`,
    };
  }

  const body = new URLSearchParams({
    apikey: apiKey,
    number: input.to,
    message: buildBookingConfirmationMessage(input),
  });

  const senderName = process.env.SEMAPHORE_SENDER_NAME;
  if (senderName) {
    body.set("sendername", senderName);
  }

  try {
    const response = await fetch(SEMAPHORE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const json = (await response.json().catch(() => null)) as
      | SemaphoreMessageResponse[]
      | SemaphoreErrorResponse
      | null;

    if (!response.ok || !json) {
      return {
        outcome: "failed",
        reason: `Semaphore responded with ${response.status}.`,
      };
    }

    // Success responses are a JSON array (one entry per recipient); error
    // responses are a JSON object keyed by the offending field
    // (e.g. `{ "apikey": ["Invalid API Key."] }`).
    if (Array.isArray(json)) {
      const first = json[0];
      if (!first) {
        return { outcome: "failed", reason: "Semaphore returned an empty response." };
      }
      return { outcome: "sent", providerMessageId: String(first.message_id ?? "") };
    }

    const reason = Object.values(json).flat().join(" ") || "Semaphore rejected the request.";
    return { outcome: "failed", reason };
  } catch (error) {
    return {
      outcome: "failed",
      reason: error instanceof Error ? error.message : "Semaphore request failed.",
    };
  }
}
