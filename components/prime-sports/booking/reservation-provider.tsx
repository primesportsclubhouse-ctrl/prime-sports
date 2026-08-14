'use client';

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { operatingHours, SportKey } from "@/lib/prime-sports";

type ContactDetails = {
  fullName: string;
  email: string;
  phone: string;
};

export type BookingLineItem = {
  date: Date;
  sport: SportKey;
  courtIndex: number;
  timeIndex: number;
  // Present once the slot has a real server-side row behind it (i.e. after
  // addBooking() resolves). Absent only in the brief window before that
  // round-trip finishes.
  id?: string;
  status?: string;
  pricePhp?: number;
  waiverAccepted?: boolean;
};

type AddBookingResult = { ok: true } | { ok: false; error: string };

type ReservationContextValue = {
  contact: ContactDetails | null;
  bookings: BookingLineItem[];
  /** This browser's session token — proves ownership of held/draft bookings
   *  to the guest-checkout API routes (payment submissions, waiver
   *  acceptance, etc.) the same way it already does for /api/bookings. */
  sessionToken: string | null;
  /** True once the initial rehydration fetch (GET /api/bookings) has
   *  settled — lets pages avoid flashing an empty state before the
   *  server-backed session catches up. */
  isHydrated: boolean;
  setContact: (contact: ContactDetails) => void;
  /** Persists a picked slot as a real `held` booking row before reflecting
   *  it in local state, so a refresh on any later step can recover it from
   *  the server instead of only from in-memory React state. */
  addBooking: (item: Omit<BookingLineItem, "id" | "status" | "pricePhp">) => Promise<AddBookingResult>;
  /** Cancels the server-side booking (freeing the slot immediately) and
   *  removes it from local state. */
  removeBooking: (item: BookingLineItem) => Promise<void>;
  /** Re-runs the GET /api/bookings rehydration fetch — used after a
   *  server-side mutation that isn't reflected by addBooking/removeBooking
   *  alone (e.g. accepting the waiver, or a payment submission moving a
   *  booking to `pending_payment`), so local state catches back up with
   *  what the server now has. */
  refreshBookings: () => Promise<void>;
};

const ReservationContext = createContext<ReservationContextValue | null>(null);

const SESSION_TOKEN_KEY = "prime-sports:session-token";
const CONTACT_STORAGE_KEY = "prime-sports:contact";

function sameSlot(a: BookingLineItem, b: BookingLineItem) {
  return (
    a.date.toDateString() === b.date.toDateString() &&
    a.sport === b.sport &&
    a.courtIndex === b.courtIndex &&
    a.timeIndex === b.timeIndex
  );
}

function toBookingDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseBookingDateString(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  return new Date(year, month - 1, day);
}

/** Resolves (minting if needed) this browser's session token. Runs as a
 *  `useState` lazy initializer — i.e. synchronously during the first render,
 *  not in an effect — since it's pure/synchronous browser-storage work with
 *  nothing to await; see the equivalent lazy-init below for `contact`. */
function resolveSessionToken() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const existing = window.localStorage.getItem(SESSION_TOKEN_KEY);
    if (existing) {
      return existing;
    }

    const next = window.crypto.randomUUID();
    window.localStorage.setItem(SESSION_TOKEN_KEY, next);
    return next;
  } catch {
    return window.crypto.randomUUID();
  }
}

function resolveStoredContact(): ContactDetails | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(CONTACT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    // Corrupt/unavailable localStorage — non-fatal, contact just won't
    // pre-fill until the user re-enters it or a server hydration below
    // supplies it instead.
    return null;
  }
}

export function ReservationProvider({ children }: { children: ReactNode }) {
  const [contact, setContactState] = useState<ContactDetails | null>(resolveStoredContact);
  const [bookings, setBookings] = useState<BookingLineItem[]>([]);
  const [sessionToken] = useState<string | null>(resolveSessionToken);
  const [isHydrated, setIsHydrated] = useState(false);

  // Shared by the initial rehydration effect below and by `refreshBookings`
  // (exposed through context for callers that mutate booking/waiver state
  // server-side without going through addBooking/removeBooking, e.g.
  // checkout-client.tsx after a waiver acceptance or payment submission).
  const fetchFromServer = useCallback(async () => {
    if (!sessionToken) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings?sessionToken=${encodeURIComponent(sessionToken)}`);
      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (data.contact) {
        setContactState(data.contact);
        try {
          window.localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(data.contact));
        } catch {
          // Non-fatal.
        }
      }

      if (Array.isArray(data.bookings)) {
        const hydrated: BookingLineItem[] = data.bookings
          .map(
            (entry: {
              bookingDate: string;
              sport: SportKey;
              courtIndex: number;
              hour24: number;
              id: string;
              status: string;
              pricePhp: number;
              waiverAccepted?: boolean;
            }) => {
              const timeIndex = operatingHours.indexOf(entry.hour24);
              if (timeIndex === -1) {
                return null;
              }

              return {
                id: entry.id,
                date: parseBookingDateString(entry.bookingDate),
                sport: entry.sport,
                courtIndex: entry.courtIndex,
                timeIndex,
                status: entry.status,
                pricePhp: entry.pricePhp,
                waiverAccepted: entry.waiverAccepted ?? false,
              } satisfies BookingLineItem;
            },
          )
          .filter((item: BookingLineItem | null): item is BookingLineItem => item !== null);

        setBookings(hydrated);
      }
    } catch {
      // Offline/unreachable API — the flow still works locally for this
      // session, it just won't survive a refresh until connectivity is
      // back.
    }
  }, [sessionToken]);

  // The token/localStorage-contact resolution above is synchronous and
  // already settled before this ever runs — this effect only exists for the
  // actual async part: asking the server what, if anything, is already held
  // under this session's token. That's what makes a hard refresh mid-flow
  // recoverable instead of silently dropping everything, per the Phase 2
  // roadmap.
  useEffect(() => {
    // `sessionToken` is only ever null during the SSR render pass (see
    // resolveSessionToken() above) — effects never run there, so in
    // practice this effect body only executes once `sessionToken` is
    // already a real value. The guard is just for the type checker.
    if (!sessionToken) {
      return;
    }

    (async () => {
      await fetchFromServer();
      setIsHydrated(true);
    })();
  }, [sessionToken, fetchFromServer]);

  const setContact = useCallback((next: ContactDetails) => {
    setContactState(next);
    try {
      window.localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal — contact still works for the rest of this in-memory
      // session even if it can't be persisted for a future refresh.
    }
  }, []);

  const addBooking = useCallback<ReservationContextValue["addBooking"]>(
    async (item) => {
      if (!sessionToken) {
        return { ok: false, error: "Still setting up your session — try again in a moment." };
      }
      if (!contact) {
        return { ok: false, error: "Please complete your contact details first." };
      }

      const hour24 = operatingHours[item.timeIndex];

      try {
        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken,
            contact,
            sport: item.sport,
            courtIndex: item.courtIndex,
            bookingDate: toBookingDateString(item.date),
            hour24,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { ok: false, error: data?.error ?? "Could not reserve that slot." };
        }

        setBookings((prev) => [
          ...prev,
          {
            date: item.date,
            sport: item.sport,
            courtIndex: item.courtIndex,
            timeIndex: item.timeIndex,
            id: data.booking.id,
            status: data.booking.status,
            pricePhp: data.booking.pricePhp,
          },
        ]);

        return { ok: true };
      } catch {
        return { ok: false, error: "Network error — could not reserve that slot." };
      }
    },
    [sessionToken, contact],
  );

  const removeBooking = useCallback<ReservationContextValue["removeBooking"]>(
    async (item) => {
      setBookings((prev) => prev.filter((existing) => !sameSlot(existing, item)));

      if (!item.id || !sessionToken) {
        return;
      }

      try {
        await fetch(`/api/bookings/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken, status: "cancelled" }),
        });
      } catch {
        // Best-effort: the hold's TTL will still expire it server-side even
        // if this particular cancel request never lands.
      }
    },
    [sessionToken],
  );

  const value = useMemo(
    () => ({ contact, bookings, sessionToken, isHydrated, setContact, addBooking, removeBooking, refreshBookings: fetchFromServer }),
    [contact, bookings, sessionToken, isHydrated, setContact, addBooking, removeBooking, fetchFromServer],
  );

  return <ReservationContext.Provider value={value}>{children}</ReservationContext.Provider>;
}

export function useReservation() {
  const context = useContext(ReservationContext);

  if (!context) {
    throw new Error("useReservation must be used within a ReservationProvider");
  }

  return context;
}
