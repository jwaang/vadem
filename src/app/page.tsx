import type { Metadata } from "next";
import { LandingPageClient } from "./LandingPageClient";

export const metadata: Metadata = {
  title: "Vadem — Pet & House Sitter Care Manuals",
  description:
    "Create a care manual for your pet and house sitter. Share one link with daily task checklists, location photos, secure codes, and real-time updates. No app download needed.",
  alternates: {
    canonical: "https://vadem.app",
  },
  openGraph: {
    url: "https://vadem.app",
  },
};

export default function LandingPage() {
  return <LandingPageClient />;
}
