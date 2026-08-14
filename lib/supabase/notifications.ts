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

import { sendBookingConfirmationEmail } from "@/lib/email";
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
