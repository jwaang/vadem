import type { Metadata } from "next";
import { SetupStepClient } from "./SetupStepClient";
import { SETUP_STEPS, type SetupSlug } from "@/lib/setupSteps";

export const metadata: Metadata = {
  title: "Set up your home \u2013 Vadem",
  description: "Build your home care manual step by step.",
};

interface SetupStepPageProps {
  params: Promise<{ step: string }>;
}

export default async function SetupStepPage({ params }: SetupStepPageProps) {
  const { step } = await params;
  const validSlug = SETUP_STEPS.find((s) => s.slug === step);
  const slug: SetupSlug = validSlug ? validSlug.slug : "home";

  return <SetupStepClient step={slug} />;
}
