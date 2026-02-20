"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { NotificationToast } from "@/components/ui/NotificationToast";

// ── Constants ──────────────────────────────────────────────────────────────────

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

const STEPS = [
  { label: "Overlay Items", active: false },
  { label: "Sitters", active: false },
  { label: "Proof Settings", active: false },
  { label: "Share", active: true },
];

// ── Icons ──────────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Main share step ────────────────────────────────────────────────────────────

function ShareStep({ tripId }: { tripId: Id<"trips"> }) {
  const router = useRouter();
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  const generateShareLink = useAction(api.shareActions.generateShareLink);
  const updateTrip = useMutation(api.trips.update);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = shareSlug ? `${origin}/t/${shareSlug}` : null;

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const slug = await generateShareLink({ tripId });
      setShareSlug(slug);
    } catch {
      // stay enabled so user can retry
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setShowToast(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleNativeShare() {
    if (!shareUrl || !canShare) return;
    try {
      await navigator.share({ url: shareUrl, text: "Here is your Handoff!" });
    } catch {
      // user dismissed — no-op
    }
  }

  async function handleActivate() {
    setIsActivating(true);
    try {
      await updateTrip({ tripId, status: "active" });
      router.push("/dashboard");
    } catch {
      setIsActivating(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-bg-raised border-b border-border-default px-4 py-4 flex items-center gap-3">
        <a
          href={`/trip/${tripId}/proof`}
          className="font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
        >
          ← Back
        </a>
        <span className="text-border-strong">|</span>
        <h1 className="font-body text-sm font-semibold text-text-primary">
          Trip Setup
        </h1>
      </header>

      {/* Step indicator */}
      <div className="bg-bg-raised border-b border-border-default px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-2 overflow-x-auto">
          {STEPS.map(({ label, active }, i) => (
            <div key={label} className="flex items-center gap-2 shrink-0">
              {i > 0 && (
                <span className="text-border-strong font-body text-xs">→</span>
              )}
              <span
                className={[
                  "font-body text-xs font-semibold px-3 py-1 rounded-pill",
                  active
                    ? "bg-primary text-text-on-primary"
                    : "text-text-muted bg-bg-sunken",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto flex flex-col gap-6">
          {/* Heading */}
          <div>
            <h2 className="font-display text-3xl text-text-primary leading-tight">
              Share with your sitter
            </h2>
            <p className="font-body text-sm text-text-secondary mt-2">
              Your personalized care manual is ready. Generate a link and send it to your sitter — no app download required.
            </p>
          </div>

          {/* Share link card */}
          <div
            className="bg-bg-raised rounded-xl border border-border-default p-5 flex flex-col gap-4"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <div className="flex flex-col gap-1">
              <p className="font-body text-sm font-semibold text-text-primary">
                Sitter link
              </p>
              <p className="font-body text-xs text-text-muted">
                Anyone with this link can view the care manual.
              </p>
            </div>

            {shareSlug ? (
              <div className="flex flex-col gap-3">
                {/* Read-only URL input */}
                <input
                  type="text"
                  readOnly
                  value={shareUrl ?? ""}
                  className="w-full font-body text-sm text-text-primary bg-bg-sunken border border-border-default rounded-md px-3 py-2.5 outline-none font-mono cursor-default select-all"
                  aria-label="Share link URL"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={copied ? <CheckIcon /> : <CopyIcon />}
                    onClick={handleCopy}
                    className="flex-1 sm:flex-none"
                  >
                    {copied ? "Copied!" : "Copy link"}
                  </Button>

                  {canShare && (
                    <Button
                      variant="soft"
                      size="sm"
                      icon={<ShareIcon />}
                      onClick={handleNativeShare}
                      className="flex-1 sm:flex-none"
                    >
                      Share
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating…" : "Generate link"}
              </Button>
            )}
          </div>

          {/* Activate trip */}
          <div
            className="bg-bg-raised rounded-xl border border-border-default p-5 flex flex-col gap-4"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <div>
              <p className="font-body text-sm font-semibold text-text-primary">
                Ready to go?
              </p>
              <p className="font-body text-xs text-text-muted mt-0.5">
                Activating the trip makes the link live and starts task tracking.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleActivate}
              disabled={isActivating}
            >
              {isActivating ? "Activating…" : "Activate trip →"}
            </Button>
          </div>
        </div>
      </main>

      {/* Copy success toast */}
      <NotificationToast
        title="Link copied!"
        message="The sitter link is in your clipboard."
        variant="success"
        visible={showToast}
        autoDismissMs={2000}
        onDismiss={() => setShowToast(false)}
      />
    </div>
  );
}

// ── Default export (env guard) ─────────────────────────────────────────────────

export default function ShareStepInner({ tripId }: { tripId: string }) {
  if (!CONVEX_URL) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-sm text-text-muted">
          Configuration error: Convex URL not set.
        </p>
      </div>
    );
  }
  return <ShareStep tripId={tripId as Id<"trips">} />;
}
