"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/Button";
import type { SetupSlug } from "@/lib/setupSteps";
import { trackOnboardingStepCompleted, trackPropertyPublished } from "@/lib/analytics";
import { useWebHaptics } from "web-haptics/react";

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ complete, label }: { complete: boolean; label: string }) {
  return (
    <span
      className={`font-body text-xs font-semibold px-3 py-1 rounded-pill shrink-0 ${complete
        ? "bg-secondary-light text-secondary"
        : "bg-warning-light text-warning"
        }`}
    >
      {label}
    </span>
  );
}

// ── Summary row ───────────────────────────────────────────────────────────────

interface SummaryRowProps {
  stepSlug: SetupSlug;
  label: string;
  detail: string;
  complete: boolean;
  badgeText: string;
  isLast?: boolean;
}

function SummaryRow({
  stepSlug,
  label,
  detail,
  complete,
  badgeText,
  isLast,
}: SummaryRowProps) {
  return (
    <div
      className={`flex items-center gap-3 py-4 ${!isLast ? "border-b border-border-default" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-semibold text-text-primary">{label}</p>
        <p className="font-body text-xs text-text-secondary mt-0.5">{detail}</p>
      </div>
      <StatusBadge complete={complete} label={badgeText} />
      <Link
        href={`/setup/${stepSlug}`}
        className="font-body text-xs text-text-muted hover:text-primary transition-colors duration-150 shrink-0"
      >
        Edit
      </Link>
    </div>
  );
}

// ── StepReview ────────────────────────────────────────────────────────────────

export default function StepReview() {
  const router = useRouter();
  const { user } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const { trigger } = useWebHaptics();

  const sessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );

  const properties = useQuery(
    api.properties.listByOwner,
    sessionData?.userId ? { ownerId: sessionData.userId } : "skip",
  );
  const propertyId = properties?.[0]?._id;

  const summary = useQuery(
    api.properties.getManualSummary,
    propertyId ? { propertyId } : "skip",
  );

  const publishManual = useMutation(api.properties.publishManual);

  const handlePublish = () => {
    if (!propertyId) return;
    setIsPublishing(true);
    setPublishError(null);
    publishManual({ propertyId })
      .then(async () => {
        trackOnboardingStepCompleted("review");
        trackPropertyPublished();
        trigger("heavy");
        try {
          const JSConfetti = (await import("js-confetti")).default;
          const confetti = new JSConfetti();
          await confetti.addConfetti({
            emojis: ["🏠", "🐾", "🔑", "✨"],
            emojiSize: 200,
            confettiNumber: 20,
          });
        } catch {
          // Non-critical — navigate anyway
        }
        setTimeout(() => router.push("/dashboard?published=true"), 250);
      })
      .catch(() => {
        trigger("error");
        setIsPublishing(false);
        setPublishError("Failed to publish. Please try again.");
      });
  };

  const isLoading = properties === undefined || (propertyId !== undefined && summary === undefined);
  const noProperty = properties !== undefined && properties.length === 0;

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-text-primary leading-tight">
          Review & publish
        </h1>
        <p className="font-body text-sm text-text-secondary">
          Check everything looks good, then publish to make your Vadem shareable.
        </p>
      </div>

      {publishError && (
        <div
          role="alert"
          className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
        >
          {publishError}
        </div>
      )}

      {/* No property state */}
      {noProperty && (
        <div className="bg-warning-light rounded-lg px-4 py-4 flex flex-col gap-2">
          <p className="font-body text-sm font-semibold text-warning">
            Your home isn&apos;t set up yet
          </p>
          <p className="font-body text-xs text-text-secondary">
            Complete step 1 to create your property before publishing.
          </p>
          <Link
            href="/setup/home"
            className="font-body text-sm text-primary hover:text-primary-hover mt-1 font-semibold"
          >
            Go to step 1 →
          </Link>
        </div>
      )}

      {/* Summary checklist */}
      <div className="flex flex-col gap-1">
        <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
          Summary checklist
        </p>
        <div className="bg-bg-raised rounded-lg border border-border-default px-4">
          {isLoading ? (
            <div className="flex flex-col gap-3 py-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-bg-sunken animate-pulse" />
              ))}
            </div>
          ) : summary ? (
            <>
              <SummaryRow
                stepSlug="home"
                label="Your home"
                detail={
                  summary.propertyName
                    ? `${summary.propertyName}${summary.propertyAddress ? ` · ${summary.propertyAddress}` : ""}`
                    : "No property name set"
                }
                complete={summary.hasPropertyName}
                badgeText={summary.hasPropertyName ? "Complete" : "Missing"}
              />
              <SummaryRow
                stepSlug="pets"
                label="Pets"
                detail={
                  summary.petCount > 0
                    ? `${summary.petCount} pet${summary.petCount !== 1 ? "s" : ""} added`
                    : "No pets added"
                }
                complete={summary.hasAtLeastOnePet}
                badgeText={
                  summary.hasAtLeastOnePet
                    ? `${summary.petCount} pet${summary.petCount !== 1 ? "s" : ""}`
                    : "None added"
                }
              />
              <SummaryRow
                stepSlug="access"
                label="Access & security"
                detail={
                  summary.vaultItemCount > 0
                    ? `${summary.vaultItemCount} vault item${summary.vaultItemCount !== 1 ? "s" : ""} added`
                    : "No vault items added"
                }
                complete={summary.hasAtLeastOneVaultItem}
                badgeText={
                  summary.hasAtLeastOneVaultItem
                    ? `${summary.vaultItemCount} item${summary.vaultItemCount !== 1 ? "s" : ""}`
                    : "None added"
                }
              />
              <SummaryRow
                stepSlug="contacts"
                label="Emergency contacts"
                detail={
                  summary.contactCount > 0
                    ? `${summary.contactCount} contact${summary.contactCount !== 1 ? "s" : ""}`
                    : "No contacts added"
                }
                complete={summary.hasAtLeastOneContact}
                badgeText={
                  summary.hasAtLeastOneContact
                    ? `${summary.contactCount} contact${summary.contactCount !== 1 ? "s" : ""}`
                    : "None added"
                }
              />
              <SummaryRow
                stepSlug="instructions"
                label="House instructions"
                detail={
                  summary.sectionCount > 0
                    ? `${summary.sectionCount} section${summary.sectionCount !== 1 ? "s" : ""} · ${summary.instructionCount} instruction${summary.instructionCount !== 1 ? "s" : ""}`
                    : "No sections added"
                }
                complete={summary.hasAtLeastOneInstruction}
                badgeText={
                  summary.hasAtLeastOneInstruction
                    ? `${summary.instructionCount} step${summary.instructionCount !== 1 ? "s" : ""}`
                    : "None added"
                }
                isLast
              />
            </>
          ) : (
            !noProperty && (
              <p className="font-body text-sm text-text-muted py-4 text-center">
                Unable to load summary. Please refresh.
              </p>
            )
          )}
        </div>
      </div>

      {/* Publish action */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          size="lg"
          className="w-full"
          onClick={handlePublish}
          disabled={isPublishing || isLoading || noProperty || !summary?.hasPropertyName}
        >
          {isPublishing ? "Publishing…" : "Publish Vadem"}
        </Button>
        {summary && !summary.hasPropertyName && !isLoading && (
          <p className="font-body text-xs text-text-muted text-center">
            Add your property name in{" "}
            <Link href="/setup/home" className="text-primary hover:text-primary-hover">
              step 1
            </Link>{" "}
            to publish.
          </p>
        )}
        <Button
          variant="ghost"
          size="default"
          className="w-full"
          onClick={() => router.push("/dashboard")}
        >
          Save & finish later
        </Button>
      </div>
    </div>
  );
}
