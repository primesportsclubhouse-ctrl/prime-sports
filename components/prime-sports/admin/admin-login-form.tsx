'use client';

import { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { primeButtonPrimaryClass } from "@/lib/prime-sports";

export default function AdminLoginForm() {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/admin/dashboard");
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] opacity-60">Email</span>
        <input
          type="email"
          name="email"
          placeholder="staff@primesports.club"
          required
          className="min-h-11 w-full rounded-[var(--radius)] border border-border bg-canvas px-3 text-sm font-normal outline-none transition focus:border-accent-secondary"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] opacity-60">Password</span>
        <input
          type="password"
          name="password"
          placeholder="Enter your password"
          required
          className="min-h-11 w-full rounded-[var(--radius)] border border-border bg-canvas px-3 text-sm font-normal outline-none transition focus:border-accent-secondary"
        />
      </label>

      <button type="submit" className={`${primeButtonPrimaryClass} min-h-11 w-full justify-center`}>
        Sign in
      </button>
    </form>
  );
}
