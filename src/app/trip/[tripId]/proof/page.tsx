import type { Metadata } from "next";
import { ProofPageClient } from "./ProofPageClient";

export const metadata: Metadata = {
  title: "Trip Setup — Proof Settings | Handoff",
};

export default async function TripProofPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <ProofPageClient tripId={tripId} />;
}
