"use client";

import dynamic from "next/dynamic";

const ProofStepInner = dynamic(() => import("./ProofStepInner"), {
  ssr: false,
});

export function ProofPageClient({ tripId }: { tripId: string }) {
  return <ProofStepInner tripId={tripId} />;
}
