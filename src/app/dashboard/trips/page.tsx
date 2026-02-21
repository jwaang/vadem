"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { CreatorLayout } from "@/components/layouts/CreatorLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { NotificationToast } from "@/components/ui/NotificationToast";
import { CalendarIcon, PlusIcon, CopyIcon, ShareNetworkIcon, CheckIcon, RefreshIcon } from "@/components/ui/icons";

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
}

function ShareLinkPanel({ tripId, initialSlug, initialHasPassword = false }: ShareLinkPanelProps) {
  const [shareSlug, setShareSlug] = useState<string | null>(initialSlug ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResharePrompt, setShowResharePrompt] = useState(false);

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

            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(true);
                  setShowResharePrompt(false);
                }}
                className="btn btn-no-shadow font-body text-sm text-danger flex items-center gap-1.5 self-start px-0 py-1 hover:text-[#b04444] transition-colors duration-150"
              >
                <RefreshIcon size={14} />
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
        `You already have a ${existingTrip.status} trip (${formatTripDate(existingTrip.startDate)} – ${formatTripDate(existingTrip.endDate)}). Please complete or delete it first.`,
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

  if (existingTrip) {
    const isActive = existingTrip.status === "active";
    return (
      <div
        className="bg-bg-raised rounded-xl border border-border-default p-6 flex flex-col gap-4"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
            <CalendarIcon size={22} className="text-accent" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <p className="font-body text-sm font-semibold text-text-primary">
              {isActive ? "Active trip" : "Trip in progress"}
            </p>
            <p className="font-body text-xs text-text-secondary">
              {formatTripDate(existingTrip.startDate)} – {formatTripDate(existingTrip.endDate)}
            </p>
            <Badge variant={isActive ? "success" : "overlay"}>
              {existingTrip.status.charAt(0).toUpperCase() + existingTrip.status.slice(1)}
            </Badge>
          </div>
        </div>

        {isActive && (
          <ShareLinkPanel
            tripId={existingTrip._id}
            initialSlug={existingTrip.shareLink}
            initialHasPassword={!!existingTrip.linkPassword}
          />
        )}

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
        <h3 className="font-body text-base font-semibold text-text-primary">New Trip</h3>
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

  // Still loading — propertyId is known but existingTrip hasn't resolved yet
  const isLoading = propertyId !== undefined && existingTrip === undefined;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-text-primary leading-tight">Trips</h1>
          <p className="font-body text-sm text-text-secondary mt-1.5">
            Plan and manage your upcoming trips
          </p>
        </div>
        {!showForm && !existingTrip && !isLoading && (
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

      {isLoading ? (
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

      {!showForm && !existingTrip && !isLoading && (
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

export default function TripsPage() {
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
