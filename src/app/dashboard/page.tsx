"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { CreatorLayout, type CreatorNavId } from "@/components/layouts/CreatorLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ActivityFeedItem } from "@/components/ui/ActivityFeedItem";
import { Badge } from "@/components/ui/Badge";

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

  // Existing trip — show blocking message
  if (existingTrip) {
    return (
      <div
        className="bg-bg-raised rounded-xl border border-border-default p-6 flex flex-col gap-4"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
            <CalendarIcon className="text-accent" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <p className="font-body text-sm font-semibold text-text-primary">
              Trip already in progress
            </p>
            <p className="font-body text-xs text-text-secondary">
              {existingTrip.startDate} → {existingTrip.endDate}
            </p>
            <Badge variant="overlay">
              {existingTrip.status.charAt(0).toUpperCase() + existingTrip.status.slice(1)}
            </Badge>
          </div>
        </div>
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
          {/* Sample activity for demo (will be real data in a later story) */}
          <div className="px-5 pt-1 pb-1">
            <ActivityFeedItem
              type="view"
              name="You"
              action="created your account"
              timestamp="Just now"
              hideBorder
            />
          </div>
          <div className="px-5 py-4 border-t border-border-default flex items-center gap-2">
            <ClockIcon className="text-text-muted" />
            <p className="font-body text-xs text-text-muted">
              Sitter activity will appear here once your first trip is active
            </p>
          </div>
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

      {/* Danger zone */}
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.replace("/login");
    }
  }, [mounted, user, isLoading, router]);

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
      {renderContent()}
    </CreatorLayout>
  );
}
