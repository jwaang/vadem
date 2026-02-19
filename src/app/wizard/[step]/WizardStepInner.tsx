"use client";

import Link from "next/link";
import { WizardProgress } from "@/components/ui/WizardProgress";
import Step1Home from "./Step1Home";
import Step2Pets from "./Step2Pets";
import Step3Access from "./Step3Access";

interface WizardStepInnerProps {
  step: number;
}

function ComingSoon({ step }: { step: number }) {
  return (
    <div className="bg-bg-raised rounded-xl p-8 text-center flex flex-col gap-4 items-center">
      <p className="font-body text-sm text-text-muted">Step {step} is coming soon.</p>
      <Link
        href="/wizard/1"
        className="font-body text-sm text-primary hover:text-primary-hover underline underline-offset-2"
      >
        Back to step 1
      </Link>
    </div>
  );
}

function WizardLayout({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-bg flex flex-col items-center px-4 pt-8 pb-12">
      <div className="w-full max-w-lg flex flex-col gap-6">
        {/* Wordmark */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="font-display text-2xl text-primary italic hover:text-primary-hover transition-colors duration-150"
          >
            Handoff
          </Link>
        </div>

        {/* Progress indicator */}
        <WizardProgress currentStep={step - 1} />

        {/* Step card */}
        <div
          className="bg-bg-raised rounded-xl"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          {children}
        </div>
      </div>
    </main>
  );
}

export default function WizardStepInner({ step }: WizardStepInnerProps) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <WizardLayout step={step}>
        <div className="p-8 text-center">
          <p className="font-body text-sm text-text-muted">
            Backend service is not configured. Set{" "}
            <code className="font-mono text-xs bg-bg-sunken px-1 py-0.5 rounded">
              NEXT_PUBLIC_CONVEX_URL
            </code>{" "}
            to enable the wizard.
          </p>
        </div>
      </WizardLayout>
    );
  }

  return (
    <WizardLayout step={step}>
      {step === 1 ? (
        <Step1Home />
      ) : step === 2 ? (
        <Step2Pets />
      ) : step === 3 ? (
        <Step3Access />
      ) : (
        <ComingSoon step={step} />
      )}
    </WizardLayout>
  );
}
