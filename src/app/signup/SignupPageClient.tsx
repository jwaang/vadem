"use client";

import dynamic from "next/dynamic";

const SignupForm = dynamic(() => import("./SignupForm"), { ssr: false });

export function SignupPageClient({ originTripId }: { originTripId?: string | null }) {
  return <SignupForm originTripId={originTripId} />;
}
