import type { Metadata } from "next";
import { DetailsPageClient } from "./DetailsPageClient";

export const metadata: Metadata = {
  title: "Trip Details | Vadem",
};

export default async function TripDetailsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <DetailsPageClient tripId={tripId} />;
}
