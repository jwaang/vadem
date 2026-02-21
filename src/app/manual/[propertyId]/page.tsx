import type { Metadata } from "next";
import { ManualPageClient } from "./ManualPageClient";

export const metadata: Metadata = {
  title: "Home Manual | Vadem",
};

export default async function ManualPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  return <ManualPageClient propertyId={propertyId} />;
}
