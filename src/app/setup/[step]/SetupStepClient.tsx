"use client";

import dynamic from "next/dynamic";
import type { SetupSlug } from "@/lib/setupSteps";

const SetupStepInner = dynamic(() => import("./SetupStepInner"), { ssr: false });

interface SetupStepClientProps {
  step: SetupSlug;
}

export function SetupStepClient({ step }: SetupStepClientProps) {
  return <SetupStepInner step={step} />;
}
