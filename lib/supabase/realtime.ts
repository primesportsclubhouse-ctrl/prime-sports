'use client';

// Shared client-side hook for the Phase 3 realtime slice — both the booking
// calendar (`bookings` / `slot_holds`) and the staff verification queue
// (`payment_submissions`) need the exact same shape: subscribe to a set of
// tables, treat any INSERT/UPDATE/DELETE as a "go refetch" signal (never read
// fields off the realtime payload itself — see the Phase 3 migration for why
// the anon-facing rows are deliberately column-restricted), debounce bursts
// of events into one refetch, and fall back to polling if the socket never
// reaches (or drops out of) the `SUBSCRIBED` state.

import { useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";

type UseRealtimeRefreshOptions = {
  /** Set to false to tear down (or never establish) the subscription —
   *  mirrors the conditional-fetch pattern already used elsewhere (e.g.
   *  reservation-provider.tsx guarding on `sessionToken`). */
  enabled?: boolean;
  /** How long to wait, after the *last* event in a burst, before calling
   *  `onChange` — several rows changing in the same transaction (e.g.
   *  create_booking_draft()'s slot_holds insert + bookings insert) should
   *  trigger one refetch, not two. */
  debounceMs?: number;
  /** Poll interval used only while the channel isn't confirmed `SUBSCRIBED`
   *  (dropped connection, blocked WebSocket, etc.) — a reasonable
   *  degrade-to-stale-but-not-frozen fallback rather than leaving the UI
   *  silently out of date until the socket happens to recover. */
  pollIntervalMs?: number;
};

/**
 * Subscribes to Postgres change events on `tables` (all events, `public`
 * schema) and invokes `onChange` whenever something changes, debounced.
 * Cleans up its channel and any fallback poll timer on unmount or when
 * `tables`/`enabled` change.
 */
export function useRealtimeRefresh(
  channelName: string,
  tables: string[],
  onChange: () => void,
  options?: UseRealtimeRefreshOptions,
) {
  const enabled = options?.enabled ?? true;
  const debounceMs = options?.debounceMs ?? 400;
  const pollIntervalMs = options?.pollIntervalMs ?? 15000;

  // Kept in a ref so the effect below never needs `onChange` itself as a
  // dependency — callers can pass a fresh closure every render without
  // tearing down and re-establishing the channel each time. Updated from its
  // own effect (not assigned during render) — mutating a ref's `.current`
  // outside of an effect/event handler is a lint error under this project's
  // react-hooks ruleset.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const tablesKey = tables.join(",");

  useEffect(() => {
    if (!enabled || tablesKey === "") {
      return;
    }

    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let didSubscribe = false;
    let torn = false;

    function scheduleRefresh() {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        onChangeRef.current();
      }, debounceMs);
    }

    function startPollFallback() {
      if (pollTimer) {
        return;
      }
      pollTimer = setInterval(() => {
        onChangeRef.current();
      }, pollIntervalMs);
    }

    function stopPollFallback() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    let channel = supabase.channel(channelName);
    for (const table of tablesKey.split(",")) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => scheduleRefresh(),
      );
    }

    channel.subscribe((status) => {
      if (torn) {
        return;
      }

      if (status === "SUBSCRIBED") {
        didSubscribe = true;
        stopPollFallback();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        didSubscribe = false;
        startPollFallback();
      }
    });

    // Belt-and-suspenders: some failure modes (e.g. WebSockets blocked
    // entirely by a network/proxy) never call the status callback above with
    // an error state at all — they just never reach SUBSCRIBED. Falling back
    // to polling if that hasn't happened within a few seconds means the grid
    // still goes "slightly stale" instead of "frozen forever" either way.
    const initialFallbackTimer = setTimeout(() => {
      if (!didSubscribe) {
        startPollFallback();
      }
    }, 5000);

    return () => {
      torn = true;
      clearTimeout(initialFallbackTimer);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      stopPollFallback();
      void supabase.removeChannel(channel);
    };
  }, [channelName, tablesKey, enabled, debounceMs, pollIntervalMs]);
}
