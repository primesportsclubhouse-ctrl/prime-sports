'use client';

import { ReactNode, createContext, useContext, useMemo, useState } from "react";

import { SportKey } from "@/lib/prime-sports";

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
};

type ReservationContextValue = {
  contact: ContactDetails | null;
  bookings: BookingLineItem[];
  setContact: (contact: ContactDetails) => void;
  setBookings: (bookings: BookingLineItem[]) => void;
};

const ReservationContext = createContext<ReservationContextValue | null>(null);

export function ReservationProvider({ children }: { children: ReactNode }) {
  const [contact, setContact] = useState<ContactDetails | null>(null);
  const [bookings, setBookings] = useState<BookingLineItem[]>([]);

  const value = useMemo(
    () => ({ contact, bookings, setContact, setBookings }),
    [contact, bookings],
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