'use client';

import { ReactNode, createContext, useContext, useMemo, useState } from "react";

type ContactDetails = {
  fullName: string;
  email: string;
  phone: string;
};

type ScheduleSelection = {
  date: Date;
  courtIndex: number;
  timeIndex: number;
};

type ReservationContextValue = {
  contact: ContactDetails | null;
  schedule: ScheduleSelection | null;
  setContact: (contact: ContactDetails) => void;
  setSchedule: (schedule: ScheduleSelection) => void;
};

const ReservationContext = createContext<ReservationContextValue | null>(null);

export function ReservationProvider({ children }: { children: ReactNode }) {
  const [contact, setContact] = useState<ContactDetails | null>(null);
  const [schedule, setSchedule] = useState<ScheduleSelection | null>(null);

  const value = useMemo(
    () => ({ contact, schedule, setContact, setSchedule }),
    [contact, schedule],
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
