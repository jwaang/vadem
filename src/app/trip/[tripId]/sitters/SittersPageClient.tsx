"use client";

import dynamic from "next/dynamic";

const SittersStepInner = dynamic(() => import("./SittersStepInner"), {
  ssr: false,
});

export function SittersPageClient({ tripId }: { tripId: string }) {
  return <SittersStepInner tripId={tripId} />;
}
