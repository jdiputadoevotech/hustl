import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disabled: Hustl pages are cookie/auth + DB driven, so they're dynamic by
  // nature. With cacheComponents on, every uncached Supabase read must sit
  // inside <Suspense>, which throws "Blocking Route" on each data-fetching
  // page. Off = dynamic-by-default, no per-page Suspense gymnastics.
  cacheComponents: false,
  images: {
    remotePatterns: [
      {
        // Supabase Storage public objects (gig-images bucket).
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
