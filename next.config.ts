import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "images.unsplash.com" },
      { hostname: "*.convex.cloud" },
    ],
  },
  async redirects() {
    return [
      { source: "/wizard", destination: "/setup/home", permanent: true },
      { source: "/wizard/1", destination: "/setup/home", permanent: true },
      { source: "/wizard/2", destination: "/setup/pets", permanent: true },
      { source: "/wizard/3", destination: "/setup/access", permanent: true },
      { source: "/wizard/4", destination: "/setup/contacts", permanent: true },
      { source: "/wizard/5", destination: "/setup/instructions", permanent: true },
      { source: "/wizard/6", destination: "/setup/review", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
