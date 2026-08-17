// Best-effort "tell the customer their booking happened" side effect —
// mirrors lib/supabase/audit-log.ts's contract exactly: call this
// fire-and-forget (`void sendBookingConfirmationNotifications(...)`) after a
// route handler's primary mutation has already succeeded. It never throws
// and never blocks the response, and it records every attempted send
// (sent / failed / skipped, one row per channel) to `notification_log` —
// see the Phase 3 notifications migration — so staff/devs have a queryable
// trail of whether confirmations are actually going out, which matters most
// right now while RESEND_API_KEY / SEMAPHORE_API_KEY are both unset and
// every attempt should honestly log as "skipped" rather than silently doing
// nothing.

import { sendBookingConfirmationEmail, sendBookingSubmittedEmail, type BookingSubmittedSlot } from "@/lib/email";
import { sendBookingConfirmationSms } from "@/lib/sms";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type BookingConfirmationNotificationInput = {
  bookingId: string;
  /** e.g. "booking_confirmed" — stored as-is in notification_log.event, kept
   *  as a plain string (not an enum) so future trigger points don't require
   *  a migration to add a new event name. */
  event: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  courtName: string;
  bookingDateLabel: string;
  timeSlotLabel: string;
  pricePhpLabel: string;
  /** The booker's shareable, booking-scoped roster check-in link (see
   *  approve/route.ts for how it's built) — `null` if no live slot_holds row
   *  (and therefore no session_token) was found for this booking's slot,
   *  which the email degrades from honestly rather than emailing a broken
   *  link. SMS intentionally doesn't carry this — see lib/sms.ts, unchanged
   *  by this feature; a link doesn't fit that channel's short-message shape
   *  the way it does the email's CTA button. */
  rosterCheckinUrl: string | null;
};

type LogArgs = {
  bookingId: string;
  channel: "email" | "sms";
  event: string;
  recipient: string | null;
  status: "sent" | "failed" | "skipped";
  providerMessageId?: string | null;
  errorMessage?: string | null;
};

async function logNotificationAttempt(
  supabase: ReturnType<typeof createServiceRoleClient>,
  args: LogArgs,
): Promise<void> {
  const { error } = await supabase.from("notification_log").insert({
    booking_id: args.bookingId,
    channel: args.channel,
    event: args.event,
    recipient: args.recipient ?? null,
    status: args.status,
    provider_message_id: args.providerMessageId ?? null,
    error_message: args.errorMessage ?? null,
  });

  if (error) {
    console.error(
      `[notifications] failed to record ${args.channel} log entry for booking ${args.bookingId}:`,
      error.message,
    );
  }
}

/**
 * Sends (or honestly records skipping) both the email and SMS booking
 * confirmation for one booking. Every failure mode — missing customer
 * contact info, unconfigured provider, provider request failure, or a
 * notification_log insert failure — is caught and logged to the server
 * console; this function resolves successfully regardless, so callers never
 * need their own try/catch around a fire-and-forget call.
 */
export async function sendBookingConfirmationNotifications(
  input: BookingConfirmationNotificationInput,
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    // --- Email -------------------------------------------------------------
    try {
      if (!input.email) {
        console.warn(
          `[notifications] booking ${input.bookingId} has no customer email on file — skipping email confirmation.`,
        );
        await logNotificationAttempt(supabase, {
          bookingId: input.bookingId,
          channel: "email",
          event: input.event,
          recipient: null,
          status: "skipped",
          errorMessage: "Customer has no email on file.",
        });
      } else {
        const result = await sendBookingConfirmationEmail({
          to: input.email,
          customerName: input.customerName,
          courtName: input.courtName,
          bookingDateLabel: input.bookingDateLabel,
          timeSlotLabel: input.timeSlotLabel,
          pricePhpLabel: input.pricePhpLabel,
          bookingId: input.bookingId,
          rosterCheckinUrl: input.rosterCheckinUrl,
        });

        if (result.outcome === "skipped") {
          console.warn(`[notifications] email skipped for booking ${input.bookingId}: ${result.reason}`);
        } else if (result.outcome === "failed") {
          console.error(`[notifications] email failed for booking ${input.bookingId}: ${result.reason}`);
        }

        await logNotificationAttempt(supabase, {
          bookingId: input.bookingId,
          channel: "email",
          event: input.event,
          recipient: input.email,
          status: result.outcome,
          providerMessageId: result.outcome === "sent" ? result.providerMessageId : null,
          errorMessage: result.outcome === "sent" ? null : result.reason,
        });
      }
    } catch (error) {
      console.error(
        `[notifications] unexpected error sending email for booking ${input.bookingId}:`,
        error instanceof Error ? error.message : error,
      );
    }

    // --- SMS -----------------------------------------------------------------
    try {
      if (!input.phone) {
        console.warn(
          `[notifications] booking ${input.bookingId} has no customer phone on file — skipping SMS confirmation.`,
        );
        await logNotificationAttempt(supabase, {
          bookingId: input.bookingId,
          channel: "sms",
          event: input.event,
          recipient: null,
          status: "skipped",
          errorMessage: "Customer has no phone on file.",
        });
      } else {
        const result = await sendBookingConfirmationSms({
          to: input.phone,
          courtName: input.courtName,
          bookingDateLabel: input.bookingDateLabel,
          timeSlotLabel: input.timeSlotLabel,
        });

        if (result.outcome === "skipped") {
          console.warn(`[notifications] SMS skipped for booking ${input.bookingId}: ${result.reason}`);
        } else if (result.outcome === "failed") {
          console.error(`[notifications] SMS failed for booking ${input.bookingId}: ${result.reason}`);
        }

        await logNotificationAttempt(supabase, {
          bookingId: input.bookingId,
          channel: "sms",
          event: input.event,
          recipient: input.phone,
          status: result.outcome,
          providerMessageId: result.outcome === "sent" ? result.providerMessageId : null,
          errorMessage: result.outcome === "sent" ? null : result.reason,
        });
      }
    } catch (error) {
      console.error(
        `[notifications] unexpected error sending SMS for booking ${input.bookingId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  } catch (error) {
    console.error(
      `[notifications] unexpected error sending confirmations for booking ${input.bookingId}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

export type BookingSubmittedNotificationInput = {
  /** One or more bookings covered by a single payment submission — checkout
   *  lets a guest pick several slots before submitting one reference number
   *  for all of them (see POST /api/payment-submissions), so this sends one
   *  combined email rather than one per slot. Each booking still gets its
   *  own notification_log row (that table is keyed per-booking), all
   *  sharing the same send outcome since they went out as a single email. */
  bookingIds: string[];
  customerName: string;
  email: string | null;
  referenceNo: string;
  slots: BookingSubmittedSlot[];
};

/**
 * Sends (or honestly records skipping) the "we've received your booking —
 * pending verification" email right after a guest submits a payment
 * reference. Email-only (no SMS) — distinct from
 * sendBookingConfirmationNotifications above, which fires later once staff
 * actually approve the submission. Same never-throws, always-resolves
 * contract: a missing email on file, an unconfigured provider, or a
 * notification_log insert failure are all caught and logged, never thrown.
 */
export async function sendBookingSubmittedNotification(
  input: BookingSubmittedNotificationInput,
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const event = "booking_submitted";

    if (!input.email) {
      console.warn(
        `[notifications] payment submission for booking(s) ${input.bookingIds.join(", ")} has no customer email on file — skipping "booking submitted" email.`,
      );
      await Promise.all(
        input.bookingIds.map((bookingId) =>
          logNotificationAttempt(supabase, {
            bookingId,
            channel: "email",
            event,
            recipient: null,
            status: "skipped",
            errorMessage: "Customer has no email on file.",
          }),
        ),
      );
      return;
    }

    const result = await sendBookingSubmittedEmail({
      to: input.email,
      customerName: input.customerName,
      referenceNo: input.referenceNo,
      slots: input.slots,
    });

    if (result.outcome === "skipped") {
      console.warn(`[notifications] "booking submitted" email skipped for ${input.bookingIds.join(", ")}: ${result.reason}`);
    } else if (result.outcome === "failed") {
      console.error(`[notifications] "booking submitted" email failed for ${input.bookingIds.join(", ")}: ${result.reason}`);
    }

    await Promise.all(
      input.bookingIds.map((bookingId) =>
        logNotificationAttempt(supabase, {
          bookingId,
          channel: "email",
          event,
          recipient: input.email,
          status: result.outcome,
          providerMessageId: result.outcome === "sent" ? result.providerMessageId : null,
          errorMessage: result.outcome === "sent" ? null : result.reason,
        }),
      ),
    );
  } catch (error) {
    console.error(
      `[notifications] unexpected error sending "booking submitted" email for ${input.bookingIds.join(", ")}:`,
      error instanceof Error ? error.message : error,
    );
  }
}
