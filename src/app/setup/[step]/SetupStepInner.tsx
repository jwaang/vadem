"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WizardProgress } from "@/components/ui/WizardProgress";
import { SETUP_STEPS, type SetupSlug } from "@/lib/setupSteps";
import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon } from "@/components/ui/icons";
import StepHome from "./StepHome";
import StepPets from "./StepPets";
import StepAccess from "./StepAccess";
import StepContacts from "./StepContacts";
import StepInstructions from "./StepInstructions";
import StepReview from "./StepReview";

interface SetupStepInnerProps {
  step: SetupSlug;
}

function getStepIndex(slug: SetupSlug): number {
  return SETUP_STEPS.findIndex((s) => s.slug === slug);
}

function ComingSoon() {
  return (
    <div className="bg-bg-raised rounded-xl p-8 text-center flex flex-col gap-4 items-center">
      <p className="font-body text-sm text-text-muted">This step is coming soon.</p>
      <Link
        href="/setup/home"
        className="font-body text-sm text-primary hover:text-primary-hover underline underline-offset-2"
      >
        Back to step 1
      </Link>
    </div>
  );
}

function SetupLayout({
  step,
  wide,
  children,
}: {
  step: SetupSlug;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const stepIndex = getStepIndex(step);
  const prevSlug = stepIndex > 0 ? SETUP_STEPS[stepIndex - 1].slug : null;

  return (
    <main className="min-h-dvh bg-bg flex flex-col items-center px-4 pt-8 pb-12">
      <div className={`w-full flex flex-col gap-6 ${wide ? "max-w-lg lg:max-w-4xl" : "max-w-lg"}`}>
        {/* Wordmark */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="font-display text-2xl text-primary italic hover:text-primary-hover transition-colors duration-150 bg-transparent border-none cursor-pointer"
          >
            Vadem
          </button>
        </div>

        {/* Exit confirmation dialog */}
        {showExitConfirm && (
          <div className="bg-warning-light rounded-xl p-5 flex flex-col gap-3 border border-warning">
            <p className="font-body text-sm font-semibold text-text-primary">
              Leave the wizard?
            </p>
            <p className="font-body text-xs text-text-secondary">
              Any unsaved changes on this step will be lost. Completed steps are already saved.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowExitConfirm(false)}>
                Stay
              </Button>
              <Button variant="primary" size="sm" onClick={() => router.push("/dashboard")}>
                Leave
              </Button>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        <WizardProgress currentStep={stepIndex} />

        {/* Back button */}
        {prevSlug && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/setup/${prevSlug}`)}
            className="self-start -mt-2"
          >
            <ChevronLeftIcon size={14} />
            Back
          </Button>
        )}

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

export default function SetupStepInner({ step }: SetupStepInnerProps) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <SetupLayout step={step}>
        <div className="p-8 text-center">
          <p className="font-body text-sm text-text-muted">
            Backend service is not configured. Set{" "}
            <code className="font-mono text-xs bg-bg-sunken px-1 py-0.5 rounded">
              NEXT_PUBLIC_CONVEX_URL
            </code>{" "}
            to enable the wizard.
          </p>
        </div>
      </SetupLayout>
    );
  }

  return (
    <SetupLayout step={step} wide={step === "pets"}>
      {step === "home" ? (
        <StepHome />
      ) : step === "pets" ? (
        <StepPets />
      ) : step === "access" ? (
        <StepAccess />
      ) : step === "contacts" ? (
        <StepContacts />
      ) : step === "instructions" ? (
        <StepInstructions />
      ) : step === "review" ? (
        <StepReview />
      ) : (
        <ComingSoon />
      )}
    </SetupLayout>
  );
}
