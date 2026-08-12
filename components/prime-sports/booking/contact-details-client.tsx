'use client';

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import BookingSteps from "@/components/prime-sports/booking/booking-steps";
import { useReservation } from "@/components/prime-sports/booking/reservation-provider";
import { useToast } from "@/components/prime-sports/toast/toast-provider";
import {
  BookingStepStatus,
  primeButtonPrimaryClass,
  primeContainerClasses,
  primeSectionEyebrowClass,
  primeSectionHeaderRowClass,
  primeSectionTitleClass,
  primeSurfacePanelClass,
} from "@/lib/prime-sports";

const inputClassName =
  "min-h-12 w-full rounded-[var(--radius)] border-2 border-border bg-surface-muted px-4 text-[15px] font-medium text-foreground outline-none transition placeholder:text-muted/50 focus:border-accent-secondary focus:shadow-[0_0_0_4px_rgba(212,163,89,0.12)]";

const labelClassName = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] opacity-60";

export default function ContactDetailsClient() {
  const router = useRouter();
  const { showToast } = useToast();
  const { setContact } = useReservation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const isReady = Boolean(fullName.trim() && email.trim() && phone.trim());
  const containerClassName = primeContainerClasses.default;
  const stepStatuses: BookingStepStatus[] = [isReady ? "done" : "current", "upcoming", "upcoming", "upcoming"];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isReady) {
      return;
    }

    setContact({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() });
    showToast({
      title: "Details saved",
      description: `${fullName.trim()} · continue to pick a date and court.`,
      variant: "success",
    });
    router.push("/reserve/schedule");
  }

  return (
    // Cream band: everything from the step timeline down to (but not including) the
    // footer — the page title above this stays on the default dark background.
    <div className="bg-foreground text-canvas" data-nav-theme="light">
      <BookingSteps statuses={stepStatuses} />

      <section className={`${containerClassName} py-10`} data-od-id="contact-details">
        <div className={primeSectionHeaderRowClass}>
          <div>
            <p className={primeSectionEyebrowClass}>Who&apos;s Booking</p>
            <h2 className={primeSectionTitleClass}>Your contact details</h2>
          </div>
        </div>

        <form
          className={`${primeSurfacePanelClass} mx-auto grid max-w-[560px] gap-5`}
          onSubmit={handleSubmit}
          noValidate
        >
          <label className="block">
            <span className={labelClassName}>
              Full Name <span className="text-accent">required</span>
            </span>
            <input
              type="text"
              name="fullName"
              autoComplete="name"
              placeholder="Juan Dela Cruz"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={inputClassName}
            />
          </label>

          <label className="block">
            <span className={labelClassName}>
              Email <span className="text-accent">required</span>
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="juan@email.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClassName}
            />
          </label>

          <label className="block">
            <span className={labelClassName}>
              Phone Number <span className="text-accent">required</span>
            </span>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              placeholder="09XX XXX XXXX"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={inputClassName}
            />
          </label>

          <div className="flex items-center justify-end border-t border-border pt-5">
            <button
              type="submit"
              className={primeButtonPrimaryClass}
              aria-disabled={!isReady}
              disabled={!isReady}
            >
              Next: Pick Date &amp; Court →
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
