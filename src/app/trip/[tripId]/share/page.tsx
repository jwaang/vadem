import type { Metadata } from "next";
import { SharePageClient } from "./SharePageClient";

export const metadata: Metadata = {
  title: "Trip Setup — Share | Vadem",
};

export default async function TripSharePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <SharePageClient tripId={tripId} />;
}
