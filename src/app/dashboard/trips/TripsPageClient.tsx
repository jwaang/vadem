"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { CreatorLayout } from "@/components/layouts/CreatorLayout";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Badge } from "@/components/ui/Badge";
import { NotificationToast } from "@/components/ui/NotificationToast";
import { CalendarIcon, PlusIcon, CopyIcon, ShareNetworkIcon, CheckIcon, RefreshIcon, HomeIcon, ChevronRightIcon, TrashIcon, PencilIcon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { trackTripCreated } from "@/lib/analytics";

// ── Date formatting ────────────────────────────────────────────────────

function formatTripDate(isoDate: string): string {
  // Parse YYYY-MM-DD without timezone conversion
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Share Link Panel ───────────────────────────────────────────────────

interface ShareLinkPanelProps {
  tripId: string;
  initialSlug?: string;
  initialHasPassword?: boolean;
  showResharePrompt?: boolean;
}

function ShareLinkPanel({ tripId, initialSlug, initialHasPassword = false, showResharePrompt = false }: ShareLinkPanelProps) {
  const [shareSlug, setShareSlug] = useState<string | null>(initialSlug ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const generateShareLink = useAction(api.shareActions.generateShareLink);
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
      await navigator.share({ url: shareUrl, text: "Here is your Vadem!" });
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

            {showResharePrompt && (
              <p className="font-body text-xs text-secondary font-semibold">
                New link generated — share it with your sitter again.
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                onClick={handleCopy}
                className="flex-1"
              >
                {copied ? "Copied!" : "Copy link"}
              </Button>
              {canShare && (
                <Button
                  variant="soft"
                  size="sm"
                  icon={<ShareNetworkIcon size={14} />}
                  onClick={handleNativeShare}
                >
                  Share
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Button variant="soft" size="sm" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Generating…" : "Generate share link"}
          </Button>
        )}

        {shareSlug && (
          <div className="flex flex-col gap-2 pt-1">
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

// ── Empty State Card ──────────────────────────────────────────────────

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
      <div className={["w-12 h-12 rounded-xl flex items-center justify-center", iconBg].join(" ")}>
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

// ── New Trip Form (inner — uses Convex hooks) ──────────────────────────

function NewTripFormInner({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const { user } = useAuth();

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

  const existingTrip = useQuery(
    api.trips.getExistingTrip,
    propertyId ? { propertyId } : "skip",
  );

  const createTrip = useMutation(api.trips.createTrip);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteTrip = useMutation(api.trips.remove);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResharePrompt, setShowResharePrompt] = useState(false);
  const [resetError, setResetError] = useState("");
  const regenerateShareLink = useAction(api.shareActions.regenerateShareLink);

  // ── Date editing state ───────────────────────────────────────────────
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editDateError, setEditDateError] = useState("");
  const [isSavingDates, setIsSavingDates] = useState(false);
  const updateTripDates = useMutation(api.trips.updateTripDates);

  const outOfRangeItems = useQuery(
    api.overlayItems.listOutOfRangeByTrip,
    isEditingDates && editStartDate && editEndDate && editEndDate > editStartDate && existingTrip
      ? { tripId: existingTrip._id, startDate: editStartDate, endDate: editEndDate }
      : "skip",
  );

  function handleStartEditDates() {
    if (!existingTrip) return;
    setEditStartDate(existingTrip.startDate);
    setEditEndDate(existingTrip.endDate);
    setEditDateError("");
    setIsEditingDates(true);
  }

  function handleCancelEditDates() {
    setIsEditingDates(false);
    setEditStartDate("");
    setEditEndDate("");
    setEditDateError("");
  }

  async function handleSaveDates() {
    if (!existingTrip) return;
    if (!editStartDate || !editEndDate) {
      setEditDateError("Please select both dates.");
      return;
    }
    if (editEndDate <= editStartDate) {
      setEditDateError("End date must be after start date.");
      return;
    }
    setIsSavingDates(true);
    setEditDateError("");
    try {
      await updateTripDates({
        tripId: existingTrip._id,
        startDate: editStartDate,
        endDate: editEndDate,
      });
      setIsEditingDates(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update dates.";
      setEditDateError(msg);
    } finally {
      setIsSavingDates(false);
    }
  }

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
        `You already have a ${existingTrip.status} trip (${formatTripDate(existingTrip.startDate)} – ${formatTripDate(existingTrip.endDate)}). Please complete or delete it first.`,
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const tripId = await createTrip({ propertyId, startDate, endDate });
      trackTripCreated();
      router.push(`/trip/${tripId}/overlay`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create trip. Please try again.";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  }

  if (existingTrip) {
    const isActive = existingTrip.status === "active";
    // Determine if the trip hasn't started yet (start date is in the future)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const isUpcoming = isActive && existingTrip.startDate > todayStr;
    return (
      <div
        className="bg-bg-raised rounded-xl border border-border-default flex flex-col"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        {/* Card header */}
        <div className="p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
            <CalendarIcon size={22} className="text-accent" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={isUpcoming ? "overlay" : isActive ? "success" : "overlay"}>
                {isUpcoming ? "Upcoming" : existingTrip.status.charAt(0).toUpperCase() + existingTrip.status.slice(1)}
              </Badge>
              {isActive && (
                <Link
                  href={`/trip/${existingTrip._id}/share`}
                  className="ml-auto font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150 shrink-0"
                >
                  Manage →
                </Link>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <p className="font-body text-xs text-text-secondary">
                {formatTripDate(existingTrip.startDate)} – {formatTripDate(existingTrip.endDate)}
              </p>
              {(existingTrip.status === "draft" || existingTrip.status === "active") && !isEditingDates && (
                <IconButton
                  icon={<PencilIcon size={12} />}
                  variant="default"
                  size="sm"
                  aria-label="Edit trip dates"
                  onClick={handleStartEditDates}
                />
              )}
            </div>
          </div>
        </div>

        {isEditingDates && (
          <div className="border-t border-border-default px-5 py-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="Start date"
                id="edit-start-date"
                value={editStartDate}
                min={isUpcoming || !isActive ? todayStr : undefined}
                onChange={(v) => {
                  setEditStartDate(v);
                  setEditDateError("");
                }}
                required
              />
              <DatePicker
                label="End date"
                id="edit-end-date"
                value={editEndDate}
                min={editStartDate || todayStr}
                onChange={(v) => {
                  setEditEndDate(v);
                  setEditDateError("");
                }}
                required
              />
            </div>

            {outOfRangeItems && outOfRangeItems.length > 0 && (
              <div className="bg-warning-light rounded-lg px-4 py-3 flex flex-col gap-1">
                <p className="font-body text-xs font-semibold text-warning">
                  {outOfRangeItems.length} task{outOfRangeItems.length > 1 ? "s" : ""} outside new date range
                </p>
                <ul className="font-body text-xs text-warning list-disc list-inside">
                  {outOfRangeItems.slice(0, 5).map((item) => (
                    <li key={item._id}>
                      {item.text}{item.date ? ` (${formatTripDate(item.date)})` : ""}
                    </li>
                  ))}
                  {outOfRangeItems.length > 5 && (
                    <li>…and {outOfRangeItems.length - 5} more</li>
                  )}
                </ul>
                <p className="font-body text-xs text-warning">
                  These tasks won&apos;t appear for your sitter. You can edit them after saving.
                </p>
              </div>
            )}

            {editDateError && (
              <p className="font-body text-xs text-danger" role="alert">
                {editDateError}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveDates}
                disabled={isSavingDates}
              >
                {isSavingDates ? "Saving…" : "Save dates"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEditDates}
                disabled={isSavingDates}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isActive && (
          <div className="border-t border-border-default px-5 pb-4 pt-4">
            <ShareLinkPanel
              tripId={existingTrip._id}
              initialSlug={existingTrip.shareLink}
              initialHasPassword={!!existingTrip.linkPassword}
              showResharePrompt={showResharePrompt}
            />
          </div>
        )}

        {!isActive && (
          <div className="px-5 pb-5 flex flex-col gap-3">
            <p className="font-body text-xs text-text-muted">
              You can only have one active trip at a time. Continue setting up your current trip or delete it to start a new one.
            </p>
            <Button
              variant="primary"
              onClick={() => router.push(`/trip/${existingTrip._id}/overlay`)}
            >
              Continue Trip Setup
            </Button>
          </div>
        )}

        {/* Footer: destructive actions */}
        <div className="border-t border-border-default px-5 py-3">
          {showResetConfirm ? (
            <div className="bg-warning-light text-warning rounded-lg p-4 flex flex-col gap-3">
              <p className="font-body text-sm font-semibold">
                This will revoke access for anyone with the current link
              </p>
              <p className="font-body text-xs">
                A new unique URL will be generated. The old link will stop working immediately.
              </p>
              {resetError && (
                <div role="alert" className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm">
                  {resetError}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    setIsResetting(true);
                    setResetError("");
                    try {
                      await regenerateShareLink({ tripId: existingTrip._id as Parameters<typeof regenerateShareLink>[0]["tripId"] });
                      setShowResetConfirm(false);
                      setShowResharePrompt(true);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : "Failed to reset link. Please try again.";
                      setResetError(msg);
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                  disabled={isResetting}
                  className="flex-1"
                >
                  {isResetting ? "Resetting…" : "Confirm reset"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowResetConfirm(false);
                    setResetError("");
                  }}
                  disabled={isResetting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : showDeleteConfirm ? (
            <div className="bg-danger-light rounded-lg p-4 flex flex-col gap-3">
              <div>
                <p className="font-body text-sm font-semibold text-text-primary">Permanently delete this trip?</p>
                <p className="font-body text-xs text-text-secondary mt-1">
                  This will permanently delete the trip, all task completions, proof photos, activity history, and revoke sitter access. This cannot be undone.
                </p>
              </div>
              {deleteError && (
                <div role="alert" className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm">
                  {deleteError}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={isDeleting}
                  onClick={async () => {
                    if (!user?.token) return;
                    setIsDeleting(true);
                    setDeleteError("");
                    try {
                      await deleteTrip({ tripId: existingTrip._id, token: user.token });
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : "Failed to delete trip. Please try again.";
                      setDeleteError(msg);
                      setIsDeleting(false);
                    }
                  }}
                >
                  {isDeleting ? "Deleting…" : "Delete permanently"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {isActive && existingTrip.shareLink && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RefreshIcon size={14} />}
                  onClick={() => {
                    setShowResetConfirm(true);
                    setShowDeleteConfirm(false);
                    setShowResharePrompt(false);
                  }}
                >
                  Reset link
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={<TrashIcon size={14} />}
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setShowResetConfirm(false);
                }}
                className="text-danger hover:text-danger-hover"
              >
                Delete trip
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-bg-raised rounded-xl border border-border-default p-6 flex flex-col gap-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div>
        <h3 className="font-body text-base font-semibold text-text-primary">New Trip</h3>
        <p className="font-body text-xs text-text-secondary mt-0.5">
          Set your travel dates to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <DatePicker
            label="Start date"
            id="trip-start-date"
            value={startDate}
            min={today}
            onChange={(v) => {
              setStartDate(v);
              setDateError("");
            }}
            required
          />
          <DatePicker
            label="End date"
            id="trip-end-date"
            value={endDate}
            min={startDate || today}
            onChange={(v) => {
              setEndDate(v);
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

// ── New Trip Form (outer — env guard) ─────────────────────────────────

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

// ── Past Trips (inner — uses Convex hooks) ────────────────────────────

function PastTripsInner() {
  const { user } = useAuth();

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

  const allTrips = useQuery(
    api.trips.listByProperty,
    propertyId ? { propertyId } : "skip",
  );

  const pastTrips = (allTrips ?? []).filter(
    (t) => t.status === "completed" || t.status === "expired",
  );

  if (pastTrips.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-body text-sm font-semibold text-text-secondary uppercase tracking-wide">
        Past trips
      </h2>
      {pastTrips.map((trip) => (
        <div
          key={trip._id}
          className="bg-bg-raised rounded-lg border border-border-default px-4 py-3 flex items-center gap-4"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <p className="font-body text-sm font-semibold text-text-primary">
              {formatTripDate(trip.startDate)} – {formatTripDate(trip.endDate)}
            </p>
            <p className="font-body text-xs text-text-muted capitalize">{trip.status}</p>
          </div>
          <Link
            href={`/dashboard/trips/${trip._id}/report`}
            className="font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150 shrink-0"
          >
            View report →
          </Link>
        </div>
      ))}
    </div>
  );
}

function PastTrips() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return null;
  return <PastTripsInner />;
}

// ── Trips Section (inner — has access to Convex queries) ──────────────

function TripsSectionInner() {
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();

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

  const existingTrip = useQuery(
    api.trips.getExistingTrip,
    propertyId ? { propertyId } : "skip",
  );

  const hasNoProperty = properties !== undefined && properties.length === 0;

  // Still loading — propertyId is known but existingTrip hasn't resolved yet
  const isLoading = !hasNoProperty && (propertyId !== undefined && existingTrip === undefined);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-text-primary leading-tight">Trips</h1>
          <p className="font-body text-sm text-text-secondary mt-1.5">
            Plan and manage your upcoming trips
          </p>
        </div>
        {!hasNoProperty && !showForm && !existingTrip && !isLoading && (
          <Button
            variant="primary"
            size="sm"
            icon={<PlusIcon size={16} />}
            onClick={() => setShowForm(true)}
          >
            New Trip
          </Button>
        )}
      </div>

      {hasNoProperty ? (
        <Link
          href="/setup/home"
          className="bg-bg-raised rounded-xl border border-border-default p-5 flex items-center gap-4 no-underline hover:border-border-strong transition-colors duration-150"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="w-11 h-11 rounded-xl bg-primary-subtle flex items-center justify-center shrink-0">
            <HomeIcon size={22} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-semibold text-text-primary">
              Set up your home first
            </p>
            <p className="font-body text-xs text-text-muted mt-0.5">
              Add your property before creating a trip — it only takes a minute.
            </p>
          </div>
          <ChevronRightIcon size={16} className="text-text-muted shrink-0" />
        </Link>
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-bg-sunken animate-pulse" />
          ))}
        </div>
      ) : showForm ? (
        <NewTripForm onCancel={() => setShowForm(false)} />
      ) : existingTrip ? (
        <NewTripFormInner onCancel={() => setShowForm(false)} />
      ) : (
        <EmptyStateCard
          icon={<CalendarIcon className="text-accent" />}
          iconBg="bg-accent-subtle"
          title="No trips yet"
          description="Create a trip to generate a shareable manual and invite your sitter."
          cta="New Trip"
          onCta={() => setShowForm(true)}
          variant="solid"
        />
      )}

      {!hasNoProperty && !showForm && !existingTrip && !isLoading && (
        <div className="flex flex-col gap-3">
          <h2 className="font-body text-sm font-semibold text-text-secondary uppercase tracking-wide">
            How trips work
          </h2>
          {[
            { step: "1", text: "Set your travel dates" },
            { step: "2", text: "Invite your sitter by link or email" },
            { step: "3", text: "They get a care manual for your pets and home" },
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

      <PastTrips />
    </div>
  );
}

// ── Trips Section ─────────────────────────────────────────────────────

function TripsSection() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="font-display text-4xl text-text-primary leading-tight">Trips</h1>
        <p className="font-body text-sm text-text-muted">Backend not configured.</p>
      </div>
    );
  }
  return <TripsSectionInner />;
}

// ── Loading Screen ────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center">
      <p className="font-body text-text-muted">Loading…</p>
    </div>
  );
}

// ── Trips Page ────────────────────────────────────────────────────────

export default function TripsPageClient() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.replace("/login");
    }
  }, [mounted, user, isLoading, router]);

  if (!mounted || isLoading || !user) {
    return <LoadingScreen />;
  }

  return (
    <CreatorLayout>
      <TripsSection />
    </CreatorLayout>
  );
}
