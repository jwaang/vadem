import type { Metadata } from "next";
import { TripReportPageClient } from "./TripReportPageClient";

export const metadata: Metadata = {
  title: "Trip Report | Vadem",
};

export default async function TripReportPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <TripReportPageClient tripId={tripId} />;
}
