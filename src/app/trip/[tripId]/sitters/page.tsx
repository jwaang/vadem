import type { Metadata } from "next";
import { SittersPageClient } from "./SittersPageClient";

export const metadata: Metadata = {
  title: "Trip Setup — Sitters | Vadem",
};

export default async function TripSittersPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <SittersPageClient tripId={tripId} />;
}
