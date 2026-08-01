import type { Metadata } from "next";
import Link from "next/link";

import AdminLoginForm from "@/components/prime-sports/admin/admin-login-form";

export const metadata: Metadata = {
  title: "Admin Login | Prime Sports",
  description: "Staff access portal for Prime Sports administration.",
};

export default function AdminPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(120%_140%_at_10%_0%,rgba(212,163,89,0.2)_0%,transparent_45%),linear-gradient(180deg,var(--canvas)_0%,var(--surface-muted)_100%)] px-4 py-10">
      <section className="w-full max-w-md rounded-[var(--radius)] border border-border bg-surface p-7 shadow-[var(--shadow-md)]">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">Protected Route</p>
        <h1 className="[font-family:var(--font-heading)] text-3xl font-extrabold uppercase tracking-[0.06em]">Admin Login</h1>
        <p className="mt-2 text-sm opacity-70">Sign in with your staff credentials to continue to the admin dashboard.</p>

        <AdminLoginForm />

        <div className="mt-5 border-t border-border pt-4 text-xs opacity-65">
          Looking for the public site?{" "}
          <Link href="/" className="font-semibold text-accent hover:text-accent-secondary">
            Go to home
          </Link>
        </div>
      </section>
    </main>
  );
}