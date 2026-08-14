'use client';

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { primeButtonPrimaryClass } from "@/lib/prime-sports";

export default function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(result?.error ?? "Unable to sign in. Please try again.");
        setIsSubmitting(false);
        return;
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius)] border border-accent bg-[rgba(200,55,45,0.12)] px-3 py-2 text-[13px] font-medium text-accent"
        >
          {error}
        </p>
      ) : null}
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

      <button
        type="submit"
        disabled={isSubmitting}
        className={`${primeButtonPrimaryClass} min-h-11 w-full justify-center`}
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
