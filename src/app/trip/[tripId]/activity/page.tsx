import type { Metadata } from "next";
import { TripActivityPageClient } from "./TripActivityPageClient";

export const metadata: Metadata = {
  title: "Activity Feed | Handoff",
};

export default async function TripActivityPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <TripActivityPageClient tripId={tripId} />;
}
