"use client";

import dynamic from "next/dynamic";

const OverlayStepInner = dynamic(() => import("./OverlayStepInner"), {
  ssr: false,
});

export function OverlayPageClient({ tripId }: { tripId: string }) {
  return <OverlayStepInner tripId={tripId} />;
}
