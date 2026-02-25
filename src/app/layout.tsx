import type { Metadata, Viewport } from "next";
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vadem",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Vadem — Pet & House Sitter Care Manuals",
    description:
      "One link with everything your sitter needs. Daily tasks, location photos, secure codes, and real-time updates.",
    url: "https://vadem.app",
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
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${bricolageGrotesque.variable} ${caveat.variable}`}>
      <body>
        <ConvexClientProvider>
          <AuthProvider>{children}</AuthProvider>
        </ConvexClientProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}