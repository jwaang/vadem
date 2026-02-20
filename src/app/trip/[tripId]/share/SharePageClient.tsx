"use client";

import dynamic from "next/dynamic";

const ShareStepInner = dynamic(() => import("./ShareStepInner"), {
  ssr: false,
});

export function SharePageClient({ tripId }: { tripId: string }) {
  return <ShareStepInner tripId={tripId} />;
}
