"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { NotificationToast } from "@/components/ui/NotificationToast";
import { RefreshIcon } from "@/components/ui/icons";
import { TripSetupHeader } from "@/components/ui/TripSetupHeader";
import { trackShareLinkCopied } from "@/lib/analytics";
import { useWebHaptics } from "web-haptics/react";

// ── Constants ──────────────────────────────────────────────────────────────────

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

const STEPS = [
  { label: "Details", active: false, href: "details" },
  { label: "One-Time Tasks", active: false, href: "overlay" },
  { label: "Sitters", active: false, href: "sitters" },
  { label: "Proof Settings", active: false, href: "proof" },
  { label: "Share", active: true, href: "share" },
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function msToDateString(ms: number): string {
  return new Date(ms).toISOString().split("T")[0];
}

function dateStringToEndOfDayMs(dateStr: string): number {
  return new Date(dateStr + "T23:59:59.999Z").getTime();
}

// ── Main share step ────────────────────────────────────────────────────────────

function ShareStep({ tripId }: { tripId: Id<"trips"> }) {
  const router = useRouter();
  const { trigger } = useWebHaptics();
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [expiryValue, setExpiryValue] = useState("");
  const [expiryError, setExpiryError] = useState("");
  const [isSavingExpiry, setIsSavingExpiry] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResharePrompt, setShowResharePrompt] = useState(false);

  const [hasPassword, setHasPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const trip = useQuery(api.trips.get, { tripId });
  const generateShareLink = useAction(api.shareActions.generateShareLink);
  const regenerateShareLink = useAction(api.shareActions.regenerateShareLink);
  const updateTrip = useMutation(api.trips.update);
  const setLinkExpiry = useMutation(api.trips.setLinkExpiry);
  const setLinkPasswordAction = useAction(api.shareActions.setLinkPassword);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  // Seed shareSlug from the existing trip record if it already has a link
  useEffect(() => {
    if (trip?.shareLink && !shareSlug) {
      setShareSlug(trip.shareLink);
    }
  }, [trip?.shareLink, shareSlug]);

  // Sync expiry value and password state from trip data
  useEffect(() => {
    if (!trip) return;
    setExpiryValue(trip.linkExpiry ? msToDateString(trip.linkExpiry) : trip.endDate);
    setHasPassword(!!trip.linkPassword);
  }, [trip]);

  // Only generate a new share link if the trip loaded and has no existing link
  useEffect(() => {
    if (shareSlug || isGenerating || trip === undefined) return;
    // trip loaded but has no shareLink yet — generate one
    if (trip !== null && !trip.shareLink) {
      let cancelled = false;
      setIsGenerating(true);
      generateShareLink({ tripId })
        .then((slug) => {
          if (!cancelled) setShareSlug(slug);
        })
        .catch(() => {
          // user can retry manually
        })
        .finally(() => {
          if (!cancelled) setIsGenerating(false);
        });
      return () => { cancelled = true; };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, trip]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = shareSlug ? `${origin}/t/${shareSlug}` : null;

  async function handleReset() {
    setIsResetting(true);
    try {
      const slug = await regenerateShareLink({ tripId });
      setShareSlug(slug);
      setShowResetConfirm(false);
      setShowResharePrompt(true);
      setCopied(false);
    } catch {
      // stay enabled so user can retry
    } finally {
      setIsResetting(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    trigger("success");
    trackShareLinkCopied();
    setCopied(true);
    setShowToast(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleNativeShare() {
    if (!shareUrl || !canShare) return;
    try {
      await navigator.share({ url: shareUrl, text: "Here is your Vadem!" });
    } catch {
      // user dismissed — no-op
    }
  }

  async function handleExpirySelect(dateStr: string) {
    if (!dateStr || !trip) return;
    setExpiryValue(dateStr);
    setExpiryError("");
    setIsSavingExpiry(true);
    try {
      const newExpiry = dateStringToEndOfDayMs(dateStr);
      await setLinkExpiry({ tripId, linkExpiry: newExpiry });
    } catch {
      setExpiryError("Could not update expiry. Please try again.");
    } finally {
      setIsSavingExpiry(false);
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setPasswordError("Please enter a password.");
      return;
    }
    setIsSavingPassword(true);
    setPasswordError("");
    try {
      await setLinkPasswordAction({
        tripId,
        password: passwordInput,
      });
      setHasPassword(true);
      setShowPasswordForm(false);
      setPasswordInput("");
    } catch {
      setPasswordError("Failed to set password. Please try again.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleRemovePassword() {
    setIsSavingPassword(true);
    try {
      await setLinkPasswordAction({ tripId });
      setHasPassword(false);
    } catch {
      // ignore
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleActivateAndCopy() {
    setIsActivating(true);
    try {
      await updateTrip({ tripId, status: "active" });
      if (shareUrl) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          trackShareLinkCopied();
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard may fail on Safari — continue to navigation
        }
      }
      window.location.href = "/dashboard";
    } catch {
      setIsActivating(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Header */}
      <TripSetupHeader tripId={tripId} />

      {/* Step indicator */}
      <div className="bg-bg-raised border-b border-border-default px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-2 overflow-x-auto">
          {STEPS.map(({ label, active, href }, i) => (
            <div key={label} className="flex items-center gap-2 shrink-0">
              {i > 0 && (
                <span className="text-border-strong font-body text-xs">→</span>
              )}
              {active ? (
                <span className="font-body text-xs font-semibold px-3 py-1 rounded-pill bg-primary text-text-on-primary">
                  {label}
                </span>
              ) : (
                <a
                  href={`/trip/${tripId}/${href}`}
                  className="font-body text-xs font-semibold px-3 py-1 rounded-pill text-text-muted bg-bg-sunken hover:text-text-secondary hover:bg-border-default transition-colors duration-150"
                >
                  {label}
                </a>
              )}
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

                {/* Re-share prompt shown after link reset */}
                {showResharePrompt && (
                  <p className="font-body text-xs text-secondary font-semibold">
                    New link generated — share it with your sitter again.
                  </p>
                )}

                {/* Copy / Share / Reset action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="soft"
                      size="sm"
                      icon={copied ? <CheckIcon /> : <CopyIcon />}
                      onClick={handleCopy}
                    >
                      {copied ? "Copied!" : "Copy link"}
                    </Button>

                    {canShare && (
                      <Button
                        variant="soft"
                        size="sm"
                        icon={<ShareIcon />}
                        onClick={handleNativeShare}
                      >
                        Share
                      </Button>
                    )}
                  </div>

                  {!showResetConfirm && (
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<RefreshIcon size={14} />}
                      onClick={() => {
                        setShowResetConfirm(true);
                        setShowResharePrompt(false);
                      }}
                      className="ml-auto"
                    >
                      Reset link
                    </Button>
                  )}
                </div>

                {showResetConfirm && (
                  <div className="bg-warning-light text-warning rounded-lg p-4 flex flex-col gap-3">
                    <p className="font-body text-sm font-semibold">
                      This will revoke access for anyone with the current link
                    </p>
                    <p className="font-body text-xs">
                      A new unique URL will be generated. The old link will stop working immediately.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleReset}
                        disabled={isResetting}
                        className="flex-1"
                      >
                        {isResetting ? "Resetting…" : "Confirm reset"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowResetConfirm(false)}
                        disabled={isResetting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="font-body text-sm text-text-muted">
                  Generating your share link…
                </p>
              </div>
            )}
          </div>

          {/* Link expiry */}
          {trip && (
            <div
              className="bg-bg-raised rounded-xl border border-border-default p-5 flex flex-col gap-4"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              <div className="flex flex-col gap-1">
                <p className="font-body text-sm font-semibold text-text-primary">
                  Link expiry
                </p>
                <p className="font-body text-xs text-text-muted">
                  The link stops working after this date. Cannot be set later than
                  the trip end date.
                </p>
              </div>

              <DatePicker
                label="Expires on"
                id="link-expiry-date"
                value={expiryValue}
                onChange={handleExpirySelect}
                min={trip.startDate}
                max={trip.endDate}
                disabled={isSavingExpiry}
                error={expiryError || undefined}
                hint={isSavingExpiry ? "Saving…" : undefined}
              />
            </div>
          )}

          {/* Password protection */}
          {shareSlug && (
            <div
              className="bg-bg-raised rounded-xl border border-border-default p-5 flex flex-col gap-4"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <p className="font-body text-sm font-semibold text-text-primary">
                    Require password to view
                  </p>
                  <p className="font-body text-xs text-text-muted">
                    Add an extra layer of security to your sitter link.
                  </p>
                  {hasPassword && (
                    <p className="font-body text-xs text-success">Password set</p>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hasPassword || showPasswordForm}
                  disabled={isSavingPassword}
                  onClick={() => {
                    trigger("light");
                    if (hasPassword) {
                      handleRemovePassword();
                    } else {
                      setShowPasswordForm((v) => !v);
                      setPasswordError("");
                      setPasswordInput("");
                    }
                  }}
                  className={[
                    "relative w-11 h-6 rounded-pill transition-colors duration-250 ease-spring focus:outline-none disabled:opacity-40 shrink-0",
                    hasPassword || showPasswordForm
                      ? "bg-secondary"
                      : "bg-border-strong",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute top-0.5 left-0 w-5 h-5 rounded-round bg-white transition-[translate] duration-250 ease-spring",
                      hasPassword || showPasswordForm ? "translate-x-[22px]" : "translate-x-[2px]",
                    ].join(" ")}
                    style={{ boxShadow: "var(--shadow-sm)" }}
                  />
                </button>
              </div>

              {showPasswordForm && !hasPassword && (
                <form onSubmit={handleSetPassword} className="flex flex-col gap-2">
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError("");
                    }}
                    placeholder="Set a password for the link"
                    autoComplete="new-password"
                    className="font-body text-sm text-text-primary bg-bg-raised border-[1.5px] border-border-default rounded-md px-3 py-2 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-text-muted focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-subtle)]"
                  />
                  {passwordError && (
                    <p className="font-body text-xs text-danger" role="alert">
                      {passwordError}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isSavingPassword}
                      className="flex-1"
                    >
                      {isSavingPassword ? "Saving..." : "Set password"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordInput("");
                        setPasswordError("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Back / Activate */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.push(`/trip/${tripId}/proof`)}>
              ← Back
            </Button>
            <Button
              variant="primary"
              onClick={handleActivateAndCopy}
              disabled={isActivating || !shareSlug}
            >
              {isActivating ? "Finishing…" : "Finish & copy link →"}
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
