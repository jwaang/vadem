"use client";

import dynamic from "next/dynamic";

const SignupForm = dynamic(() => import("./SignupForm"), { ssr: false });

export function SignupPageClient() {
  return <SignupForm />;
}
