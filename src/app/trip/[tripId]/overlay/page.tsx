import type { Metadata } from "next";
import { OverlayPageClient } from "./OverlayPageClient";

export const metadata: Metadata = {
  title: "Trip Setup | Vadem",
};

export default async function TripOverlayPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <OverlayPageClient tripId={tripId} />;
}
