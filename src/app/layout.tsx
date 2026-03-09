import type { Metadata, Viewport } from "next";
import Script from "next/script";
import {
  Instrument_Serif,
  Bricolage_Grotesque,
  Caveat,
} from "next/font/google";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { AuthProvider } from "@/lib/authContext";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage-grotesque",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vadem.app"),
  applicationName: "Vadem",
  title: {
    default: "Vadem — Pet & House Sitter Care Manuals",
    template: "%s | Vadem",
  },
  description:
    "Create a care manual for your pet and house sitter. Share one link with daily task checklists, location photos, secure codes, and real-time updates. No app download needed.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vadem",
  },
  openGraph: {
    title: "Vadem — Pet & House Sitter Care Manuals",
    description:
      "One link with everything your sitter needs. Daily tasks, location photos, secure codes, and real-time updates.",
    siteName: "Vadem",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vadem — care manuals for pet and house sitters",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vadem — Pet & House Sitter Care Manuals",
    description:
      "One link with everything your sitter needs. Daily tasks, location photos, secure codes, and real-time updates.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#C2704A",
  colorScheme: "only light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${bricolageGrotesque.variable} ${caveat.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Vadem",
              alternateName: ["Vadem App", "vadem.app"],
              url: "https://vadem.app",
              description:
                "Create care manuals for pet and house sitters with daily tasks, location photos, secure codes, and real-time updates.",
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
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
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
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
                    text: "You build the manual once and reuse it every time you travel. Each trip lets you add one-time tasks for anything that's different that week.",
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
            }),
          }}
        />
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body>
        <ConvexClientProvider>
          <AuthProvider>{children}</AuthProvider>
        </ConvexClientProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}