import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Placeholder facility photography. Swap these for the club's own CDN host
    // once real assets are available.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "plus.unsplash.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
