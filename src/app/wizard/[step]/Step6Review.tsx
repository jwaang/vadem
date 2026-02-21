"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/Button";
import { formatPhone } from "@/lib/phone";

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ complete, label }: { complete: boolean; label: string }) {
  return (
    <span
      className={`font-body text-xs font-semibold px-3 py-1 rounded-pill shrink-0 ${
        complete
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
  stepNumber: number;
  label: string;
  detail: string;
  complete: boolean;
  badgeText: string;
  isLast?: boolean;
}

function SummaryRow({
  stepNumber,
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
        href={`/wizard/${stepNumber}`}
        className="font-body text-xs text-text-muted hover:text-primary transition-colors duration-150 shrink-0"
      >
        Edit
      </Link>
    </div>
  );
}

// ── Preview: instructions for one section ─────────────────────────────────────

function PreviewSectionInstructions({
  sectionId,
}: {
  sectionId: Id<"manualSections">;
}) {
  const instructions = useQuery(api.instructions.listBySection, { sectionId });

  if (instructions === undefined) {
    return <div className="px-4 pb-3 h-4 bg-bg-sunken rounded animate-pulse mx-4 mb-3" />;
  }

  if (instructions.length === 0) {
    return (
      <p className="font-body text-xs text-text-muted italic px-4 pb-3">
        No instructions yet
      </p>
    );
  }

  return (
    <ul className="px-4 pb-3 flex flex-col gap-1.5">
      {instructions.slice(0, 3).map((inst) => (
        <li
          key={inst._id}
          className="font-body text-xs text-text-secondary flex items-start gap-2"
        >
          <span className="shrink-0 mt-0.5 text-text-muted">•</span>
          <span className="line-clamp-1">
            {inst.text || (
              <em className="text-text-muted not-italic">Empty instruction</em>
            )}
          </span>
        </li>
      ))}
      {instructions.length > 3 && (
        <li className="font-body text-xs text-text-muted">
          + {instructions.length - 3} more
        </li>
      )}
    </ul>
  );
}

// ── Read-only manual preview pane ─────────────────────────────────────────────

function ManualPreview({
  propertyId,
  propertyName,
  propertyAddress,
}: {
  propertyId: Id<"properties">;
  propertyName: string;
  propertyAddress?: string;
}) {
  const sections = useQuery(api.sections.listByProperty, { propertyId });
  const pets = useQuery(api.pets.getPetsByPropertyId, { propertyId });
  const contacts = useQuery(api.emergencyContacts.listByPropertyId, {
    propertyId,
  });
  const vaultItems = useQuery(api.vaultItems.listByPropertyId, { propertyId });

  const petEmoji = (species: string) => {
    const map: Record<string, string> = {
      dog: "🐕",
      cat: "🐈",
      bird: "🦜",
      rabbit: "🐇",
      fish: "🐠",
      hamster: "🐹",
    };
    return map[species.toLowerCase()] ?? "🐾";
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Property header */}
      <div className="bg-bg-sunken rounded-xl p-4 flex flex-col gap-1">
        <p className="font-display text-xl text-text-primary italic leading-tight">
          {propertyName}
        </p>
        {propertyAddress && (
          <p className="font-body text-xs text-text-secondary">{propertyAddress}</p>
        )}
        <p className="font-body text-xs text-text-muted mt-1">
          {pets?.length ?? 0} pet{pets?.length !== 1 ? "s" : ""} ·{" "}
          {sections?.length ?? 0} section{sections?.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Emergency contacts */}
      {contacts && contacts.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
            Emergency Contacts
          </p>
          <div className="flex flex-col gap-1.5">
            {contacts.slice(0, 4).map((contact) => (
              <div
                key={contact._id}
                className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-raised px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-body text-xs font-semibold text-text-primary truncate">
                    {contact.name || (
                      <em className="font-normal text-text-muted">No name</em>
                    )}
                  </p>
                  <p className="font-body text-xs text-text-muted">{contact.role}</p>
                </div>
                {contact.phone && (
                  <p className="font-body text-xs text-secondary shrink-0">
                    {formatPhone(contact.phone)}
                  </p>
                )}
              </div>
            ))}
            {contacts.length > 4 && (
              <p className="font-body text-xs text-text-muted">
                + {contacts.length - 4} more contacts
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pets */}
      {pets && pets.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
            Pets
          </p>
          <div className="flex flex-wrap gap-2">
            {pets.map((pet) => (
              <div
                key={pet._id}
                className="flex items-center gap-2 rounded-pill bg-primary-subtle border border-primary-light px-3 py-1.5"
              >
                <span className="text-sm">{petEmoji(pet.species)}</span>
                <span className="font-body text-xs font-semibold text-text-primary">
                  {pet.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* House sections */}
      {sections === undefined ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-bg-sunken animate-pulse" />
          ))}
        </div>
      ) : sections.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
            House Sections
          </p>
          <div className="flex flex-col gap-2">
            {sections.map((section) => (
              <div
                key={section._id}
                className="rounded-lg border border-border-default bg-bg-raised overflow-hidden"
              >
                <div className="flex items-center gap-2 px-4 py-3 bg-bg-sunken">
                  <span className="text-base" aria-hidden="true">
                    {section.icon}
                  </span>
                  <p className="font-body text-sm font-semibold text-text-primary">
                    {section.title}
                  </p>
                </div>
                <PreviewSectionInstructions sectionId={section._id} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-bg-sunken rounded-lg px-4 py-6 text-center">
          <p className="font-body text-sm text-text-muted">No sections added yet.</p>
        </div>
      )}

      {/* Vault items */}
      {vaultItems && vaultItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
            Secure Access
          </p>
          <div className="bg-vault-subtle rounded-lg border border-vault-light px-4 py-3 flex items-center gap-3">
            <span className="text-vault text-base">🔒</span>
            <p className="font-body text-sm text-vault">
              {vaultItems.length} secure item{vaultItems.length !== 1 ? "s" : ""}{" "}
              (visible after phone verification)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step6Review ───────────────────────────────────────────────────────────────

export default function Step6Review() {
  const router = useRouter();
  const { user } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

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
      .then(() => {
        router.push("/dashboard");
      })
      .catch(() => {
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
            href="/wizard/1"
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
                stepNumber={1}
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
                stepNumber={2}
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
                stepNumber={3}
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
                stepNumber={4}
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
                stepNumber={5}
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

      {/* Read-only sitter preview */}
      {propertyId && summary?.propertyName && (
        <div className="flex flex-col gap-3">
          <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
            Sitter preview
          </p>
          <div
            className="rounded-xl border border-border-default bg-bg overflow-y-auto"
            style={{ maxHeight: "400px" }}
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-block w-2 h-2 rounded-round bg-secondary" />
                <p className="font-body text-xs text-text-muted uppercase tracking-wide font-semibold">
                  Read-only · as your sitter sees it
                </p>
              </div>
              <ManualPreview
                propertyId={propertyId}
                propertyName={summary.propertyName ?? ""}
                propertyAddress={summary.propertyAddress}
              />
            </div>
          </div>
        </div>
      )}

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
            <Link href="/wizard/1" className="text-primary hover:text-primary-hover">
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
