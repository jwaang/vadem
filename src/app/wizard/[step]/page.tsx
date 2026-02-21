import type { Metadata } from "next";
import { WizardStepClient } from "./WizardStepClient";

export const metadata: Metadata = {
  title: "Set up your home – Vadem",
  description: "Build your home care manual step by step.",
};

interface WizardStepPageProps {
  params: Promise<{ step: string }>;
}

export default async function WizardStepPage({ params }: WizardStepPageProps) {
  const { step } = await params;
  const stepNum = parseInt(step, 10);

  return <WizardStepClient step={Number.isNaN(stepNum) ? 1 : stepNum} />;
}
