import type { Metadata } from "next";
import { LandingPageClient } from "./LandingPageClient";

export const metadata: Metadata = {
  title: "Vadem — Pet & House Sitter Care Manuals",
  description:
    "Create a care manual for your pet and house sitter. Share one link with daily task checklists, location photos, secure codes, and real-time updates. No app download needed.",
  alternates: {
    canonical: "https://vadem.app",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Vadem",
  alternateName: ["Vadem", "vadem.app"],
  url: "https://vadem.app",
  description:
    "Create care manuals for pet and house sitters with daily tasks, location photos, secure codes, and real-time updates.",
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Vadem",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  url: "https://vadem.app",
  description:
    "A web app that lets homeowners create structured, media-rich care manuals for pet and house sitters — shared via a single link.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Daily task checklists for sitters",
    "Location photos showing where things are",
    "Encrypted credential vault with auto-expiry",
    "Photo proof of task completion",
    "Offline access after first visit",
    "Real-time activity feed for owners",
    "Tap-to-call emergency contacts",
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does my sitter need to download an app?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. They just open the link you send them — it works in any browser. It even works offline after the first visit.",
      },
    },
    {
      "@type": "Question",
      name: "Is Vadem really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Vadem is completely free during early access. We'll let you know well in advance if that changes.",
      },
    },
    {
      "@type": "Question",
      name: "How are my door codes and passwords protected?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Vault items are encrypted end-to-end. Your sitter must verify their phone number via SMS to view them. Access auto-expires when your trip ends, and you're notified every time a code is accessed.",
      },
    },
    {
      "@type": "Question",
      name: "Can I reuse my manual for multiple trips?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You build the manual once and reuse it every time you travel. Each trip gets its own overlay for anything that's different that week.",
      },
    },
    {
      "@type": "Question",
      name: "What if my sitter doesn't have cell service at my house?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "After the first visit, everything — instructions, photos, pet profiles, emergency contacts — is cached offline. Only vault codes require an internet connection for security.",
      },
    },
    {
      "@type": "Question",
      name: "What about my privacy? Who can see my information?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Only people with your unique link can view instructions. Vault items require phone verification. You can regenerate the link at any time to revoke all access.",
      },
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <LandingPageClient />
    </>
  );
}
