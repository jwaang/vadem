import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/setup/",
          "/welcome",
          "/trip/",
          "/t/",
          "/auth/",
          "/verify-email",
          "/forgot-password",
          "/design-system",
          "/manual/",
          "/report/",
        ],
      },
    ],
    sitemap: "https://vadem.app/sitemap.xml",
  };
}
