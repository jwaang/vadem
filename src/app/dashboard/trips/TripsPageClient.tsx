"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { CreatorLayout } from "@/components/layouts/CreatorLayout";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { Badge } from "@/components/ui/Badge";
import { NotificationToast } from "@/components/ui/NotificationToast";
import { CalendarIcon, PlusIcon, CopyIcon, CheckIcon, HomeIcon, ChevronRightIcon } from "@/components/ui/icons";
import { trackTripCreated } from "@/lib/analytics";
import { formatTime12h } from "@/lib/todayViewHelpers";
import { useWebHaptics } from "web-haptics/react";

// ── Date formatting ────────────────────────────────────────────────────

function formatTripDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  const { trigger } = useWebHaptics();

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

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [dateError, setDateError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);

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
    if (!name.trim()) {
      setSubmitError("Please enter a trip name.");
      return;
    }
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
      const tripId = await createTrip({ propertyId, name: name.trim(), startDate, endDate, startTime: startTime || undefined, endTime: endTime || undefined });
      trackTripCreated();
      router.push(`/trip/${tripId}/overlay`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create trip. Please try again.";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  }

  async function handleCopyLink() {
    if (!existingTrip?.shareLink) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/t/${existingTrip.shareLink}`;
    await navigator.clipboard.writeText(url);
    trigger("success");
    setCopied(true);
    setShowCopyToast(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (existingTrip) {
    const isActive = existingTrip.status === "active";
    const nowDate = new Date();
    const todayStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}-${String(nowDate.getDate()).padStart(2, "0")}`;
    const isUpcoming = isActive && existingTrip.startDate > todayStr;
    const isDraft = existingTrip.status === "draft";
    const tripName = existingTrip.name || "Untitled Trip";

    const dateStr = `${formatTripDate(existingTrip.startDate)}${existingTrip.startTime ? ` at ${formatTime12h(existingTrip.startTime)}` : ""}`;
    const endStr = `${formatTripDate(existingTrip.endDate)}${existingTrip.endTime ? ` at ${formatTime12h(existingTrip.endTime)}` : ""}`;

    return (
      <>
        <div
          className="bg-bg-raised rounded-xl border border-border-default flex flex-col"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          {/* Card body */}
          <div className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
              <CalendarIcon size={22} className="text-accent" />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              {/* Row 1: Name + Badge */}
              <div className="flex items-center gap-2">
                <p className="font-body text-sm font-semibold text-text-primary truncate">
                  {tripName}
                </p>
                <Badge variant={isUpcoming ? "overlay" : isActive ? "success" : "overlay"}>
                  {isUpcoming ? "Upcoming" : isDraft ? "Draft" : existingTrip.status.charAt(0).toUpperCase() + existingTrip.status.slice(1)}
                </Badge>
              </div>
              {/* Row 2: Dates */}
              <p className="font-body text-xs text-text-secondary">
                {dateStr} – {endStr}
              </p>
            </div>
            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              {isActive && existingTrip.shareLink && (
                <Button
                  variant="soft"
                  size="sm"
                  icon={copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  onClick={handleCopyLink}
                >
                  {copied ? "Copied!" : "Copy link"}
                </Button>
              )}
              {isActive ? (
                <Link
                  href={`/trip/${existingTrip._id}/share`}
                  className="font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
                >
                  Manage →
                </Link>
              ) : isDraft ? (
                <Link
                  href={`/trip/${existingTrip._id}/details`}
                  className="font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
                >
                  Continue Setup →
                </Link>
              ) : null}
            </div>
          </div>

          {/* Footer: mobile only */}
          <div className="border-t border-border-default px-5 py-3 flex items-center justify-between md:hidden">
            {isActive ? (
              <Link
                href={`/trip/${existingTrip._id}/share`}
                className="font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
              >
                Manage →
              </Link>
            ) : isDraft ? (
              <Link
                href={`/trip/${existingTrip._id}/details`}
                className="font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
              >
                Continue Setup →
              </Link>
            ) : (
              <span />
            )}
            {isActive && existingTrip.shareLink && (
              <Button
                variant="soft"
                size="sm"
                icon={copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                onClick={handleCopyLink}
              >
                {copied ? "Copied!" : "Copy link"}
              </Button>
            )}
          </div>
        </div>

        <NotificationToast
          title="Link copied!"
          message="The sitter link is in your clipboard."
          variant="success"
          visible={showCopyToast}
          autoDismissMs={2000}
          onDismiss={() => setShowCopyToast(false)}
        />
      </>
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
          Name your trip and set your travel dates to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="trip-name"
            className="font-body text-xs font-semibold text-text-secondary"
          >
            Trip name
          </label>
          <input
            id="trip-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSubmitError("");
            }}
            placeholder="e.g. Spring Break 2026"
            required
            className="w-full font-body text-sm text-text-primary bg-bg-raised border-[1.5px] border-border-default rounded-md px-3 py-2.5 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-text-muted focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-subtle)]"
          />
        </div>

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

        <div className="grid grid-cols-2 gap-3">
          <TimePicker
            label="Start time"
            id="trip-start-time"
            value={startTime}
            onChange={setStartTime}
            hint="Optional"
          />
          <TimePicker
            label="End time"
            id="trip-end-time"
            value={endTime}
            onChange={setEndTime}
            hint="Optional"
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
            {isSubmitting ? "Creating..." : "Create Trip"}
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
              {trip.name || `${formatTripDate(trip.startDate)} – ${formatTripDate(trip.endDate)}`}
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
            { step: "1", text: "Name your trip and set your travel dates" },
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
