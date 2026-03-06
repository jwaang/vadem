"use client";

import dynamic from "next/dynamic";

const DetailsStepInner = dynamic(() => import("./DetailsStepInner"), {
  ssr: false,
});

export function DetailsPageClient({ tripId }: { tripId: string }) {
  return <DetailsStepInner tripId={tripId} />;
}
