"use client";

import dynamic from "next/dynamic";

const TripActivityFeed = dynamic(() => import("./TripActivityFeed"), {
  ssr: false,
});

export function TripActivityPageClient({ tripId }: { tripId: string }) {
  return <TripActivityFeed tripId={tripId} />;
}
