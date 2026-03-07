import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";

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
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const posthogWrapped: any = withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_API_KEY!,
  projectId: process.env.POSTHOG_PROJECT_ID!,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  sourcemaps: {
    enabled: true,
    deleteAfterUpload: true,
  },
});

// Wrap the PostHog-generated runAfterProductionCompile hook so source map
// upload failures (e.g. duplicate hash collisions) don't break the build.
// withPostHogConfig returns an async function at runtime despite the NextConfig type.
const wrappedConfig = async (
  phase: string,
  ctx: { defaultConfig: NextConfig },
): Promise<NextConfig> => {
  const resolved = await posthogWrapped(phase, ctx);

  const originalHook = resolved.compiler?.runAfterProductionCompile;
  if (originalHook) {
    resolved.compiler = {
      ...resolved.compiler,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      runAfterProductionCompile: async (config: any) => {
        try {
          await originalHook(config);
        } catch (err: unknown) {
          console.warn(
            "[@posthog/nextjs-config] Source map upload failed (non-fatal):",
            err,
          );
        }
      },
    };
  }

  return resolved;
};

export default wrappedConfig;
