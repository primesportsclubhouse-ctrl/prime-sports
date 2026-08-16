// Shared "what's this app's own public base URL" helper — needed anywhere
// server-side code builds an absolute link a customer will actually click
// outside the app itself (e.g. the roster check-in link embedded in the
// booking-confirmation email; see approve/route.ts and lib/email.ts). No
// convention for this existed anywhere in the codebase before this — every
// other cross-app reference so far has been a relative Next.js route.
//
// Falls back to localhost so links are still well-formed in local dev when
// NEXT_PUBLIC_SITE_URL is unset. Production (Vercel included) must set
// NEXT_PUBLIC_SITE_URL explicitly — see .env.local.example — or emailed links
// will point at localhost.

const DEFAULT_SITE_URL = "http://localhost:3000";

/** Returns the configured site base URL with any trailing slash stripped, so
 *  callers can always build `${getSiteUrl()}/some/path` without risking a
 *  doubled slash. */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (configured || DEFAULT_SITE_URL).replace(/\/+$/, "");
}
