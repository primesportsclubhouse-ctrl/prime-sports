// Shared "record what a staff member just did" helper for the
// `admin_audit_log` table (see the Phase 3 audit-log migration). Every
// staff-mutating route handler should call this exactly once, after its
// primary mutation has already succeeded — this is best-effort, additive
// logging, never a gate on the action itself. A logging failure must never
// fail the request that triggered it: recordAuditLog() swallows its own
// errors (after reporting them to the server console) rather than throwing,
// so callers can fire-and-forget it without wrapping every call site in its
// own try/catch.

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type RecordAuditLogInput = {
  /** The staff member who performed the action, from getStaffContext().
   *  Nullable because a couple of call sites (e.g. guest-organizer-driven
   *  roster actions) share a code path with staff-driven ones but should
   *  only actually log when a staff member was the one acting. Callers
   *  should skip calling this helper at all rather than pass null when the
   *  actor genuinely isn't staff — this type only allows it because staff_id
   *  itself is a nullable FK (staff_profiles rows can be deleted). */
  staffId: string;
  action: string;
  targetTable: string;
  targetId: string;
  payload?: Record<string, unknown> | null;
};

/**
 * Inserts one row into `admin_audit_log` via the service-role client (the
 * same privileged path every other staff-mutating write in this app already
 * uses — see lib/supabase/service-role.ts). Best-effort: on failure, this
 * logs the error to the server console and resolves anyway rather than
 * throwing, so a broken audit log can never take down the approve/reject/
 * roster/booking action it was recording.
 */
export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase.from("admin_audit_log").insert({
      staff_id: input.staffId,
      action: input.action,
      target_table: input.targetTable,
      target_id: input.targetId,
      payload_json: input.payload ?? null,
    });

    if (error) {
      console.error(`[audit-log] failed to record "${input.action}" on ${input.targetTable}:`, error.message);
    }
  } catch (error) {
    console.error(
      `[audit-log] unexpected error recording "${input.action}" on ${input.targetTable}:`,
      error instanceof Error ? error.message : error,
    );
  }
}
