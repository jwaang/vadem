"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { CreatorLayout, type CreatorNavId } from "@/components/layouts/CreatorLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ActivityFeedItem, type ActivityType } from "@/components/ui/ActivityFeedItem";
import { Badge } from "@/components/ui/Badge";
import { NotificationToast } from "@/components/ui/NotificationToast";

// ── Icons ────────────────────────────────────────────────────────────

function HouseIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
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
      className={className}
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
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

function ShareNetworkIcon() {
  return (
    <svg
      width="14"
      height="14"
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

function CheckSmallIcon() {
  return (
    <svg
      width="14"
      height="14"
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

// ── Share Link Panel ──────────────────────────────────────────────────

interface ShareLinkPanelProps {
  tripId: string;
  initialSlug?: string;
  initialHasPassword?: boolean;
}

function ShareLinkPanel({ tripId, initialSlug, initialHasPassword = false }: ShareLinkPanelProps) {
  const [shareSlug, setShareSlug] = useState<string | null>(initialSlug ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Reset link state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResharePrompt, setShowResharePrompt] = useState(false);

  // Password protection state
  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const generateShareLink = useAction(api.shareActions.generateShareLink);
  const regenerateShareLink = useAction(api.shareActions.regenerateShareLink);
  const setLinkPassword = useAction(api.shareActions.setLinkPassword);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = shareSlug ? `${origin}/t/${shareSlug}` : null;

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const slug = await generateShareLink({ tripId: tripId as Parameters<typeof generateShareLink>[0]["tripId"] });
      setShareSlug(slug);
    } catch {
      // stay enabled
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleReset() {
    setIsResetting(true);
    try {
      const slug = await regenerateShareLink({ tripId: tripId as Parameters<typeof regenerateShareLink>[0]["tripId"] });
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
    setCopied(true);
    setShowToast(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleNativeShare() {
    if (!shareUrl || !canShare) return;
    try {
      await navigator.share({ url: shareUrl, text: "Here is your Handoff!" });
    } catch {
      // dismissed
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
      await setLinkPassword({
        tripId: tripId as Parameters<typeof setLinkPassword>[0]["tripId"],
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
      await setLinkPassword({
        tripId: tripId as Parameters<typeof setLinkPassword>[0]["tripId"],
      });
      setHasPassword(false);
    } catch {
      // ignore
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 pt-1">
        <p className="font-body text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Sitter link
        </p>

        {shareSlug ? (
          <div className="flex flex-col gap-2">
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

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={copied ? <CheckSmallIcon /> : <CopyIcon />}
                onClick={handleCopy}
                className="flex-1"
              >
                {copied ? "Copied!" : "Copy link"}
              </Button>
              {canShare && (
                <Button
                  variant="soft"
                  size="sm"
                  icon={<ShareNetworkIcon />}
                  onClick={handleNativeShare}
                >
                  Share
                </Button>
              )}
            </div>

            {/* Reset link */}
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(true);
                  setShowResharePrompt(false);
                }}
                className="btn btn-no-shadow font-body text-sm text-danger flex items-center gap-1.5 self-start px-0 py-1 hover:text-[#b04444] transition-colors duration-150"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Reset link
              </button>
            ) : (
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
          <Button variant="soft" size="sm" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Generating…" : "Generate share link"}
          </Button>
        )}

        {/* Password protection toggle */}
        {shareSlug && (
          <div className="flex flex-col gap-2 pt-1 border-t border-border-default">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <p className="font-body text-xs font-semibold text-text-primary">
                  Require password to view
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
                    {isSavingPassword ? "Saving…" : "Set password"}
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
      </div>

      <NotificationToast
        title="Link copied!"
        message="The sitter link is in your clipboard."
        variant="success"
        visible={showToast}
        autoDismissMs={2000}
        onDismiss={() => setShowToast(false)}
      />
    </>
  );
}

// ── Shared Empty State Card ───────────────────────────────────────────

interface EmptyStateCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  cta: string;
  onCta?: () => void;
  variant?: "dashed" | "solid";
}

function EmptyStateCard({
  icon,
  iconBg,
  title,
  description,
  cta,
  onCta,
  variant = "dashed",
}: EmptyStateCardProps) {
  return (
    <div
      className={[
        "bg-bg-raised rounded-xl p-6 flex flex-col items-center text-center gap-4",
        variant === "dashed"
          ? "border border-dashed border-border-strong"
          : "border border-border-default",
      ].join(" ")}
      style={variant === "solid" ? { boxShadow: "var(--shadow-sm)" } : undefined}
    >
      <div
        className={[
          "w-12 h-12 rounded-xl flex items-center justify-center",
          iconBg,
        ].join(" ")}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-body text-sm font-semibold text-text-primary">{title}</p>
        <p className="font-body text-xs text-text-muted max-w-[260px]">{description}</p>
      </div>
      <Button variant="soft" size="sm" onClick={onCta}>
        {cta}
      </Button>
    </div>
  );
}

// ── New Trip Form (inner — uses Convex hooks) ─────────────────────────

function NewTripFormInner({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const { user } = useAuth();

  // Auth chain: token → userId → propertyId
  const sessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );
  const userId = sessionData?.userId;

  const properties = useQuery(
    api.properties.listByOwner,
    userId ? { ownerId: userId } : "skip",
  );
  const propertyId = properties?.[0]?._id;

  // Conflict check: active or draft trip already exists
  const existingTrip = useQuery(
    api.trips.getExistingTrip,
    propertyId ? { propertyId } : "skip",
  );

  const createTrip = useMutation(api.trips.createTrip);

  const today = new Date().toISOString().split("T")[0];

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateDates(): boolean {
    if (!startDate || !endDate) {
      setDateError("Please select both a start date and an end date.");
      return false;
    }
    if (endDate <= startDate) {
      setDateError("End date must be after start date.");
      return false;
    }
    setDateError("");
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateDates()) return;

    if (!propertyId) {
      setSubmitError("No property found. Please set up your home first.");
      return;
    }

    if (existingTrip) {
      setSubmitError(
        `You already have a ${existingTrip.status} trip (${existingTrip.startDate} → ${existingTrip.endDate}). Please complete or delete it first.`,
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const tripId = await createTrip({ propertyId, startDate, endDate });
      router.push(`/trip/${tripId}/overlay`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create trip. Please try again.";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  }

  // Existing trip — show card with status-appropriate actions
  if (existingTrip) {
    const isActive = existingTrip.status === "active";
    return (
      <div
        className="bg-bg-raised rounded-xl border border-border-default p-6 flex flex-col gap-4"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        {/* Trip header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
            <CalendarIcon className="text-accent" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <p className="font-body text-sm font-semibold text-text-primary">
              {isActive ? "Active trip" : "Trip in progress"}
            </p>
            <p className="font-body text-xs text-text-secondary">
              {existingTrip.startDate} → {existingTrip.endDate}
            </p>
            <Badge variant={isActive ? "success" : "overlay"}>
              {existingTrip.status.charAt(0).toUpperCase() + existingTrip.status.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Share panel — shown for active trips */}
        {isActive && (
          <ShareLinkPanel
            tripId={existingTrip._id}
            initialSlug={existingTrip.shareLink}
            initialHasPassword={!!existingTrip.linkPassword}
          />
        )}

        {/* Actions */}
        {!isActive && (
          <>
            <p className="font-body text-xs text-text-muted">
              You can only have one active trip at a time. Continue setting up your current trip or delete it to start a new one.
            </p>
            <Button
              variant="primary"
              onClick={() => router.push(`/trip/${existingTrip._id}/overlay`)}
            >
              Continue Trip Setup
            </Button>
          </>
        )}

        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/trip/${existingTrip._id}/share`)}
          >
            Manage trip setup →
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className="bg-bg-raised rounded-xl border border-border-default p-6 flex flex-col gap-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div>
        <h3 className="font-body text-base font-semibold text-text-primary">
          New Trip
        </h3>
        <p className="font-body text-xs text-text-secondary mt-0.5">
          Set your travel dates to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start date"
            type="date"
            id="trip-start-date"
            value={startDate}
            min={today}
            onChange={(e) => {
              setStartDate(e.target.value);
              setDateError("");
            }}
            required
          />
          <Input
            label="End date"
            type="date"
            id="trip-end-date"
            value={endDate}
            min={startDate || today}
            onChange={(e) => {
              setEndDate(e.target.value);
              setDateError("");
            }}
            required
          />
        </div>

        {dateError && (
          <p className="font-body text-xs text-danger" role="alert">
            {dateError}
          </p>
        )}

        {submitError && (
          <p className="font-body text-xs text-danger" role="alert">
            {submitError}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Creating…" : "Create Trip"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── New Trip Form (outer — env guard) ────────────────────────────────

function NewTripForm({ onCancel }: { onCancel: () => void }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return (
      <p className="font-body text-xs text-text-muted">
        Convex not configured. Set up NEXT_PUBLIC_CONVEX_URL to create trips.
      </p>
    );
  }
  return <NewTripFormInner onCancel={onCancel} />;
}

// ── Activity Feed Helpers ─────────────────────────────────────────────

function formatActivityTimestamp(createdAt: number): string {
  const now = Date.now();
  const diffMs = now - createdAt;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function eventToActivityType(event: string): ActivityType {
  if (event === "vault_accessed") return "vault";
  if (event === "task_completed") return "task";
  if (event === "proof_uploaded") return "proof";
  if (event === "task_unchecked") return "uncheck";
  return "view";
}

function eventToAction(event: string, vaultItemLabel?: string, taskTitle?: string): string {
  if (event === "link_opened") return "opened the sitter link";
  if (event === "vault_accessed") {
    return vaultItemLabel ? `accessed your ${vaultItemLabel}` : "accessed a vault item";
  }
  if (event === "task_completed")
    return taskTitle ? `completed "${taskTitle}"` : "completed a task";
  if (event === "proof_uploaded")
    return taskTitle ? `submitted proof for "${taskTitle}"` : "submitted a proof photo";
  if (event === "task_unchecked")
    return taskTitle ? `unmarked "${taskTitle}" as complete` : "unmarked a task as complete";
  if (event === "trip_expired") return "trip expired";
  return event.replace(/_/g, " ");
}

// ── Activity Feed (inner — uses Convex hooks) ──────────────────────────

type FeedFilter = "all" | "task_completed" | "proof_uploaded" | "vault_accessed";

function ActivityFeedSectionInner() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FeedFilter>("all");

  const sessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );
  const userId = sessionData?.userId;
  const properties = useQuery(
    api.properties.listByOwner,
    userId ? { ownerId: userId } : "skip",
  );
  const propertyId = properties?.[0]?._id;

  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local TZ
  const summary = useQuery(
    api.activityLog.getTodayTaskSummary,
    propertyId ? { propertyId, date: today } : "skip",
  );

  const activeTrip = useQuery(
    api.trips.getActiveTripForProperty,
    propertyId ? { propertyId } : "skip",
  );

  const activityResult = useQuery(
    api.activityLog.getActivityForTrip,
    activeTrip
      ? {
          tripId: activeTrip._id,
          eventType: filter === "all" ? undefined : filter,
          paginationOpts: { numItems: 5, cursor: null },
        }
      : "skip",
  );

  const events = activityResult?.items;

  const chips: { label: string; value: FeedFilter }[] = [
    { label: "All", value: "all" },
    { label: "Tasks", value: "task_completed" },
    { label: "Proof", value: "proof_uploaded" },
    { label: "Vault", value: "vault_accessed" },
  ];

  // propertyId loaded but no active trip → show placeholder
  const hasNoActiveTrip = propertyId !== undefined && activeTrip === null;

  return (
    <>
      {/* Filter chips row with today summary badge */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {chips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setFilter(chip.value)}
              className={[
                "font-body text-xs font-semibold rounded-pill px-3 py-1 border transition-colors duration-150",
                filter === chip.value
                  ? "bg-primary text-text-on-primary border-primary"
                  : "bg-bg text-text-secondary border-border-default hover:border-border-strong",
              ].join(" ")}
            >
              {chip.label}
            </button>
          ))}
        </div>
        {summary && (
          <span className="font-body text-sm bg-secondary-light text-secondary rounded-pill px-3 py-0.5 shrink-0">
            {summary.completed} of {summary.total} done
          </span>
        )}
      </div>

      {/* Feed items */}
      {hasNoActiveTrip ? (
        <div className="px-5 py-4 flex items-center gap-2">
          <ClockIcon className="text-text-muted" />
          <p className="font-body text-xs text-text-muted">
            Sitter activity will appear here once your first trip is active
          </p>
        </div>
      ) : events === undefined ? (
        <p className="font-body text-xs text-text-muted px-5 py-4">Loading activity…</p>
      ) : events.length === 0 ? (
        <div className="px-5 py-4 flex items-center gap-2">
          <ClockIcon className="text-text-muted" />
          <p className="font-body text-xs text-text-muted">
            {filter === "all"
              ? "No activity yet for this trip"
              : `No ${chips.find((c) => c.value === filter)?.label.toLowerCase()} events yet`}
          </p>
        </div>
      ) : (
        <div className="px-5 pt-1">
          {events.map((event, index) => (
            <ActivityFeedItem
              key={event._id}
              type={eventToActivityType(event.eventType)}
              name={event.sitterName ?? "Sitter"}
              action={eventToAction(event.eventType, event.vaultItemLabel, event.taskTitle)}
              timestamp={formatActivityTimestamp(event.createdAt)}
              hideBorder={index === events.length - 1}
              proofPhotoUrl={event.proofPhotoUrl}
            />
          ))}
          {activeTrip && (
            <div className="py-2 border-t border-border-default">
              <Link
                href={`/trip/${activeTrip._id}/activity`}
                className="font-body text-xs font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
              >
                View all activity →
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Activity Feed (outer — env guard) ──────────────────────────────────

function ActivityFeedSection() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return (
      <div className="px-5 py-4 flex items-center gap-2">
        <ClockIcon className="text-text-muted" />
        <p className="font-body text-xs text-text-muted">
          Sitter activity will appear here once your first trip is active
        </p>
      </div>
    );
  }
  return <ActivityFeedSectionInner />;
}

// ── Dashboard Overview ───────────────────────────────────────────────

interface DashboardOverviewProps {
  email: string;
  onNavigateToTrips: () => void;
}

function DashboardOverview({ email, onNavigateToTrips }: DashboardOverviewProps) {
  // Derive a friendly first name from email
  const firstName =
    email.split("@")[0].replace(/[^a-zA-Z]/g, " ").split(" ")[0] ?? email;
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <div className="flex flex-col gap-8">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-4xl text-text-primary leading-tight">
          Welcome, {displayName}
        </h1>
        <p className="font-body text-sm text-text-secondary mt-1.5">
          Here&rsquo;s your home at a glance
        </p>
      </div>

      {/* Property summary */}
      <section aria-labelledby="property-heading">
        <div className="flex items-center justify-between mb-3">
          <h2
            id="property-heading"
            className="font-body text-base font-semibold text-text-primary"
          >
            My Property
          </h2>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/property/pets"
              className="font-body text-xs font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
            >
              Pets →
            </Link>
            <Link
              href="/dashboard/property/sections"
              className="font-body text-xs font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
            >
              Sections →
            </Link>
            <Link
              href="/dashboard/property/contacts"
              className="font-body text-xs font-semibold text-danger hover:text-text-primary transition-colors duration-150"
            >
              Contacts →
            </Link>
            <Link
              href="/dashboard/property/vault"
              className="font-body text-xs font-semibold text-vault hover:text-vault-hover transition-colors duration-150"
            >
              Vault →
            </Link>
          </div>
        </div>
        <EmptyStateCard
          icon={<HouseIcon className="text-primary" />}
          iconBg="bg-primary-subtle"
          title="Let's set up your home"
          description="Add your property details and care instructions so sitters have everything they need."
          cta="Get started"
        />
      </section>

      {/* Active trip status */}
      <section aria-labelledby="trip-heading">
        <div className="flex items-center justify-between mb-3">
          <h2
            id="trip-heading"
            className="font-body text-base font-semibold text-text-primary"
          >
            Active Trip
          </h2>
        </div>
        <EmptyStateCard
          icon={<CalendarIcon className="text-accent" />}
          iconBg="bg-accent-subtle"
          title="No active trips"
          description="Create a trip to generate a shareable manual and invite your house sitter."
          cta="New Trip"
          onCta={onNavigateToTrips}
        />
      </section>

      {/* Recent activity */}
      <section aria-labelledby="activity-heading">
        <h2
          id="activity-heading"
          className="font-body text-base font-semibold text-text-primary mb-3"
        >
          Recent Activity
        </h2>
        <div
          className="bg-bg-raised rounded-xl border border-border-default"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <ActivityFeedSection />
        </div>
      </section>
    </div>
  );
}

// ── Trips Section ────────────────────────────────────────────────────

function TripsSection() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-text-primary leading-tight">
            Trips
          </h1>
          <p className="font-body text-sm text-text-secondary mt-1.5">
            Plan and manage your upcoming trips
          </p>
        </div>
        {!showForm && (
          <Button
            variant="primary"
            size="sm"
            icon={<PlusIcon />}
            onClick={() => setShowForm(true)}
          >
            New Trip
          </Button>
        )}
      </div>

      {showForm ? (
        <NewTripForm onCancel={() => setShowForm(false)} />
      ) : (
        <EmptyStateCard
          icon={<CalendarIcon className="text-accent" />}
          iconBg="bg-accent-subtle"
          title="No trips yet"
          description="Create a trip to generate a shareable manual and invite your house sitter."
          cta="New Trip"
          onCta={() => setShowForm(true)}
          variant="solid"
        />
      )}

      {/* How trips work */}
      {!showForm && (
        <div className="flex flex-col gap-3">
          <h2 className="font-body text-sm font-semibold text-text-secondary uppercase tracking-wide">
            How trips work
          </h2>
          {[
            { step: "1", text: "Set your travel dates" },
            { step: "2", text: "Invite your sitter by link or email" },
            { step: "3", text: "They get a personalized care manual" },
            { step: "4", text: "Track activity and get updates in real time" },
          ].map(({ step, text }) => (
            <div
              key={step}
              className="bg-bg-raised rounded-lg border border-border-default px-4 py-3 flex items-center gap-4"
            >
              <span className="w-6 h-6 rounded-round bg-accent-subtle text-accent font-body text-xs font-bold flex items-center justify-center shrink-0">
                {step}
              </span>
              <p className="font-body text-sm text-text-secondary">{text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Settings Section ──────────────────────────────────────────────────

interface SettingsSectionProps {
  email: string;
  onSignOut: () => void;
}

function SettingsSection({ email, onSignOut }: SettingsSectionProps) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl text-text-primary leading-tight">
          Settings
        </h1>
        <p className="font-body text-sm text-text-secondary mt-1.5">
          Manage your account and preferences
        </p>
      </div>

      {/* Account group */}
      <div
        className="bg-bg-raised rounded-xl border border-border-default overflow-hidden"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div className="px-5 py-3 border-b border-border-default">
          <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
            Account
          </p>
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="font-body text-sm font-semibold text-text-primary">Email address</p>
            <p className="font-body text-sm text-text-muted truncate">{email}</p>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
      </div>

      {/* Notifications */}
      <div
        className="bg-bg-raised rounded-xl border border-border-default overflow-hidden"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div className="px-5 py-3 border-b border-border-default">
          <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
            Notifications
          </p>
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="font-body text-sm font-semibold text-text-primary">
              Notification preferences
            </p>
            <p className="font-body text-xs text-text-muted">
              Configure which events send you push notifications
            </p>
          </div>
          <Link
            href="/dashboard/settings/notifications"
            className="font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150 shrink-0"
          >
            Manage →
          </Link>
        </div>
      </div>

      {/* Session */}
      <div
        className="bg-bg-raised rounded-xl border border-border-default overflow-hidden"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div className="px-5 py-3 border-b border-border-default">
          <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
            Session
          </p>
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="font-body text-sm font-semibold text-text-primary">Sign out</p>
            <p className="font-body text-xs text-text-muted">
              You&rsquo;ll need to sign in again to access your dashboard.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Push Notification Banner ──────────────────────────────────────────

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

interface PushNotificationBannerProps {
  onEnable: () => void;
  onDismiss: () => void;
  isSubscribing: boolean;
}

function PushNotificationBanner({
  onEnable,
  onDismiss,
  isSubscribing,
}: PushNotificationBannerProps) {
  return (
    <div className="bg-accent-subtle border border-accent-light rounded-lg px-4 py-3 flex items-center gap-3">
      <span className="shrink-0 text-accent">
        <BellIcon />
      </span>
      <p className="font-body text-sm text-text-primary flex-1">
        Get notified when your sitter checks in or accesses the vault.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onDismiss}
          className="font-body text-xs text-text-muted hover:text-text-secondary transition-colors duration-150"
        >
          Not now
        </button>
        <Button
          variant="primary"
          size="sm"
          onClick={onEnable}
          disabled={isSubscribing}
        >
          {isSubscribing ? "Enabling…" : "Enable"}
        </Button>
      </div>
    </div>
  );
}

/** Convert a URL-safe base64 string to a Uint8Array for the VAPID applicationServerKey. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

// ── Loading Screen ───────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center">
      <p className="font-body text-text-muted">Loading…</p>
    </div>
  );
}

// ── Dashboard Page ───────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const [activeNav, setActiveNav] = useState<CreatorNavId>("property");
  const [mounted, setMounted] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const storePushSubscription = useMutation(api.users.storePushSubscription);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.replace("/login");
    }
  }, [mounted, user, isLoading, router]);

  // Show push permission banner if permission not yet decided, or if permission was
  // granted but the subscription is missing (e.g. after clearing site data).
  useEffect(() => {
    if (!mounted || isLoading || !user) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "denied") return;
    if (sessionStorage.getItem("push_banner_dismissed")) return;
    if (Notification.permission === "default") {
      setShowPushBanner(true);
      return;
    }
    // Permission already granted — check if we actually have a subscription
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => {
          if (!sub) setShowPushBanner(true);
        }),
      );
    }
  }, [mounted, isLoading, user]);

  async function handleEnablePush() {
    setIsSubscribing(true);
    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (permission !== "granted") {
        setShowPushBanner(false);
        return;
      }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
        setShowPushBanner(false);
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      // Unsubscribe any stale subscription before creating a new one.
      // A leftover sub (e.g. from a previous VAPID key) causes an AbortError.
      const existing = await registration.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await storePushSubscription({
        token: user!.token,
        subscription: JSON.stringify(subscription),
      });
    } catch (err) {
      console.error("[Push] Subscription failed:", err);
    } finally {
      setIsSubscribing(false);
      setShowPushBanner(false);
    }
  }

  function handleDismissPush() {
    sessionStorage.setItem("push_banner_dismissed", "1");
    setShowPushBanner(false);
  }

  // Render LoadingScreen on server and client's first pass so both match.
  // After mount, re-render with real auth state.
  if (!mounted || isLoading || !user) {
    return <LoadingScreen />;
  }

  function handleSignOut() {
    signOut();
    router.push("/login");
  }

  function renderContent() {
    switch (activeNav) {
      case "trips":
        return <TripsSection />;
      case "settings":
        return <SettingsSection email={user!.email} onSignOut={handleSignOut} />;
      default:
        // "property" nav shows the full dashboard overview
        return (
          <DashboardOverview
            email={user!.email}
            onNavigateToTrips={() => setActiveNav("trips")}
          />
        );
    }
  }

  return (
    <CreatorLayout activeNav={activeNav} onNavChange={setActiveNav}>
      <div className="flex flex-col gap-6">
        {showPushBanner && (
          <PushNotificationBanner
            onEnable={handleEnablePush}
            onDismiss={handleDismissPush}
            isSubscribing={isSubscribing}
          />
        )}
        {renderContent()}
      </div>
    </CreatorLayout>
  );
}
