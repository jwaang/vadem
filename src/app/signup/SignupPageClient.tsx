"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/authContext";

const SignupForm = dynamic(() => import("./SignupForm"), { ssr: false });

export function SignupPageClient({ originTripId }: { originTripId?: string | null }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  return <SignupForm originTripId={originTripId} />;
}
