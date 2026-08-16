import type { NextConfig } from "next";

// Facility content management slice: `facility_media.src` is a plain URL
// field (see components/prime-sports/admin/facility-content-editor.tsx's own
// doc comment for why this slice didn't build a real file uploader), so a
// staff member could paste a URL hosted on this project's own Supabase
// Storage (once a public bucket exists there — none does yet, this only
// wires the `next/image` allowlist ahead of that). Parsed from
// NEXT_PUBLIC_SUPABASE_URL rather than hardcoded so this doesn't need a code
// change per environment (local vs. hosted project). A URL on any other host
// still works today — components/ui/expanding-cards.tsx's `CardMediaLayer`
// already degrades a blocked/failed image load to the club-crest fallback
// (see its own `onError` handling) rather than breaking the page.
function getSupabaseStorageHostname(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return null;
  }
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const supabaseHostname = getSupabaseStorageHostname();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
