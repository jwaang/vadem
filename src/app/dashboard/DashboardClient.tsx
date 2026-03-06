"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { CreatorLayout } from "@/components/layouts/CreatorLayout";
import { Button } from "@/components/ui/Button";
import { ActivityFeedItem, type ActivityType } from "@/components/ui/ActivityFeedItem";
import { HomeIcon, CalendarIcon, ClockIcon, BellIcon, ChevronRightIcon } from "@/components/ui/icons";
import { NotificationToast } from "@/components/ui/NotificationToast";

// ── Trip Status ────────────────────────────────────────────────────────

const TRIP_STATUS_LABELS: Record<string, string> = {
  draft: "In setup",
  active: "Active",
  expired: "Completed",
  archived: "Archived",
};

const TRIP_STATUS_CLASSES: Record<string, string> = {
  active: "bg-secondary-light text-secondary",
  draft: "bg-accent-light text-accent",
  expired: "bg-bg-sunken text-text-muted",
  archived: "bg-bg-sunken text-text-muted",
};

// ── Shared Empty State Card ────────────────────────────────────────────

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

// ── Activity Feed Helpers ──────────────────────────────────────────────

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

function eventToAction(event: string, vaultItemLabel?: string, taskTitle?: string, sectionName?: string): ReactNode {
  if (event === "link_opened") return "opened the sitter link";
  if (event === "vault_accessed") {
    return vaultItemLabel ? `accessed your ${vaultItemLabel}` : "accessed a vault item";
  }
  const sectionSuffix = sectionName
    ? <span className="text-text-muted"> in {sectionName}</span>
    : null;
  if (event === "task_completed")
    return taskTitle ? <>completed &ldquo;{taskTitle}&rdquo;{sectionSuffix}</> : "completed a task";
  if (event === "proof_uploaded")
    return taskTitle ? <>submitted proof for &ldquo;{taskTitle}&rdquo;{sectionSuffix}</> : "submitted a proof photo";
  if (event === "task_unchecked")
    return taskTitle ? <>unmarked &ldquo;{taskTitle}&rdquo; as complete{sectionSuffix}</> : "unmarked a task as complete";
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

  const today = new Date().toLocaleDateString("en-CA");
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

  const propertiesLoaded = properties !== undefined;
  const hasNoActiveTrip =
    (propertiesLoaded && !propertyId) ||
    (propertyId !== undefined && activeTrip === null);

  return (
    <>
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

      {hasNoActiveTrip ? (
        <div className="px-5 py-4 flex items-center gap-2">
          <ClockIcon size={18} className="text-text-muted" />
          <p className="font-body text-xs text-text-muted">
            Sitter activity will appear here once your first trip is active
          </p>
        </div>
      ) : events === undefined ? (
        <p className="font-body text-xs text-text-muted px-5 py-4">Loading activity…</p>
      ) : events.length === 0 ? (
        <div className="px-5 py-4 flex items-center gap-2">
          <ClockIcon size={18} className="text-text-muted" />
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
              action={eventToAction(event.eventType, event.vaultItemLabel, event.taskTitle, event.sectionName)}
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

// ── Dashboard Overview ────────────────────────────────────────────────

interface DashboardOverviewProps {
  email: string;
  token: string;
}

function formatTripDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function DashboardOverview({ email, token }: DashboardOverviewProps) {
  const router = useRouter();

  const sessionData = useQuery(
    api.auth.validateSession,
    token ? { token } : "skip",
  );
  const userId = sessionData?.userId;

  const displayName = (() => {
    if (sessionData?.firstName) return sessionData.firstName;
    const prefix = email.split("@")[0].replace(/[^a-zA-Z]/g, " ").split(" ")[0] ?? "there";
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  })();

  const properties = useQuery(
    api.properties.listByOwner,
    userId ? { ownerId: userId } : "skip",
  );
  const property = properties?.[0] ?? null;
  const propertyId = property?._id;

  const manualSummary = useQuery(
    api.properties.getManualSummary,
    propertyId ? { propertyId } : "skip",
  );

  const propertyPhotoUrl = useQuery(
    api.storage.getUrl,
    property?.photo ? { storageId: property.photo } : "skip",
  );

  const existingTrip = useQuery(
    api.trips.getExistingTrip,
    propertyId ? { propertyId } : "skip",
  );

  const today = new Date().toLocaleDateString("en-CA");
  const taskSummary = useQuery(
    api.activityLog.getTodayTaskSummary,
    propertyId && existingTrip?.status === "active"
      ? { propertyId, date: today }
      : "skip",
  );

  const isLoadingProperties = properties === undefined;

  // Signal to parent that property exists (for deferred push banner)
  useEffect(() => {
    if (property) {
      sessionStorage.setItem("has_property", "1");
    }
  }, [property]);

  let propertyContent: React.ReactNode;
  if (isLoadingProperties) {
    propertyContent = (
      <div className="bg-bg-raised rounded-xl border border-border-default p-5 animate-pulse">
        <div className="h-5 bg-bg-sunken rounded-md w-1/3 mb-3" />
        <div className="h-3 bg-bg-sunken rounded-md w-1/2" />
      </div>
    );
  } else if (!property) {
    propertyContent = (
      <EmptyStateCard
        icon={<HomeIcon size={22} className="text-primary" />}
        iconBg="bg-primary-subtle"
        title="Let's set up your home"
        description="Add your property details and care instructions so sitters have everything they need."
        cta="Get started"
        onCta={() => router.push("/setup/home")}
      />
    );
  } else {
    const summary = manualSummary;
    const propName = summary?.propertyName ?? property.name ?? "My Property";
    const hasPhoto = !!propertyPhotoUrl;

    propertyContent = (
      <div
        className="bg-bg-raised rounded-xl border border-border-default overflow-hidden"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        {/* Hero image or fallback header */}
        {hasPhoto ? (
          <div className="relative h-36 sm:h-44 overflow-hidden">
            <Image
              src={propertyPhotoUrl}
              alt={propName}
              fill
              unoptimized
              className="object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(42,31,26,0.7) 0%, rgba(42,31,26,0.15) 50%, transparent 100%)",
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="font-display italic text-xl text-white leading-snug drop-shadow-sm">
                {propName}
              </p>
              {summary?.propertyAddress && (
                <p className="font-body text-xs text-white/80 mt-0.5 drop-shadow-sm">
                  {summary.propertyAddress}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-5 pb-0 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-subtle flex items-center justify-center shrink-0">
              <HomeIcon size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-display italic text-lg text-text-primary leading-snug">
                {propName}
              </p>
              {summary?.propertyAddress && (
                <p className="font-body text-xs text-text-muted mt-0.5">
                  {summary.propertyAddress}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stats + actions */}
        <div className="p-5 pt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { label: `${summary?.petCount ?? 0} Pets` },
              { label: `${summary?.sectionCount ?? 0} Sections` },
              { label: `${summary?.contactCount ?? 0} Contacts` },
              { label: `${summary?.vaultItemCount ?? 0} Vault items` },
            ].map(({ label }) => (
              <span
                key={label}
                className="bg-bg-sunken rounded-pill px-2.5 py-1 font-body text-xs text-text-secondary"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="flex justify-end gap-4">
            <Link
              href="/dashboard/preview"
              className="font-body text-xs text-text-muted hover:text-text-primary transition-colors duration-150"
            >
              Preview as sitter →
            </Link>
            <Link
              href="/dashboard/property"
              className="font-body text-xs text-text-muted hover:text-text-primary transition-colors duration-150"
            >
              Edit property →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let tripContent: React.ReactNode = null;
  if (!isLoadingProperties && !property) {
    tripContent = (
      <EmptyStateCard
        icon={<CalendarIcon size={22} className="text-accent" />}
        iconBg="bg-accent-subtle"
        title="No trips yet"
        description="Set up your property first, then create a trip to share with your sitter."
        cta="Set up property"
        onCta={() => router.push("/setup/home")}
      />
    );
  } else if (!isLoadingProperties && property) {
    if (existingTrip === undefined) {
      tripContent = (
        <div className="bg-bg-raised rounded-xl border border-border-default p-5 animate-pulse">
          <div className="h-4 bg-bg-sunken rounded-md w-1/4 mb-3" />
          <div className="h-3 bg-bg-sunken rounded-md w-1/3" />
        </div>
      );
    } else if (existingTrip) {
      const statusClass = TRIP_STATUS_CLASSES[existingTrip.status] ?? "bg-bg-sunken text-text-muted";
      const statusLabel = TRIP_STATUS_LABELS[existingTrip.status] ?? existingTrip.status;
      const isActive = existingTrip.status === "active";

      // Compute trip duration progress for active trips
      const startMs = new Date(existingTrip.startDate + "T12:00:00").getTime();
      const endMs = new Date(existingTrip.endDate + "T12:00:00").getTime();
      const todayMs = new Date(today + "T12:00:00").getTime();
      const totalDays = Math.max(1, Math.round((endMs - startMs) / 86400000));
      const isUpcoming = todayMs < startMs;
      const daysUntilStart = Math.max(0, Math.round((startMs - todayMs) / 86400000));
      const daysLeft = Math.max(0, Math.round((endMs - todayMs) / 86400000));
      const progressPct = isActive && !isUpcoming
        ? Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100))
        : 0;

      tripContent = (
        <Link href="/dashboard/trips" className="block group">
          <div
            className="bg-bg-raised rounded-xl border border-border-default overflow-hidden transition-[border-color] duration-150 group-hover:border-border-strong"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="size-10 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
                <CalendarIcon size={20} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display italic text-base text-text-primary leading-snug text-balance">
                    {formatTripDate(existingTrip.startDate)} – {formatTripDate(existingTrip.endDate)}
                  </span>
                  <span
                    className={`font-body text-xs font-semibold rounded-pill px-2.5 py-0.5 ${statusClass}`}
                  >
                    {statusLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap text-pretty">
                  {isActive ? (
                    <>
                      <span className="font-body text-xs text-text-muted tabular-nums">
                        {isUpcoming
                          ? daysUntilStart === 1
                            ? "Starts tomorrow"
                            : `Starts in ${daysUntilStart} days`
                          : daysLeft === 0
                            ? "Last day"
                            : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}
                      </span>
                      {taskSummary && (
                        <>
                          <span className="font-body text-xs text-border-strong">·</span>
                          <span className="font-body text-xs text-text-muted tabular-nums">
                            {taskSummary.completed}/{taskSummary.total} tasks today
                          </span>
                        </>
                      )}
                      {existingTrip.shareLink && (
                        <>
                          <span className="font-body text-xs text-border-strong">·</span>
                          <span className="font-body text-xs text-secondary">Link shared</span>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="font-body text-xs text-text-muted">
                      Continue setting up your trip
                    </span>
                  )}
                </div>
              </div>
              <ChevronRightIcon size={16} className="text-text-muted group-hover:text-primary transition-colors duration-150 shrink-0" />
            </div>
            {isActive && (
              <div className="h-1.5 bg-bg-sunken">
                <div
                  className="h-full bg-accent rounded-pill transition-[width] duration-400"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </div>
        </Link>
      );
    } else {
      tripContent = (
        <EmptyStateCard
          icon={<CalendarIcon size={22} className="text-accent" />}
          iconBg="bg-accent-subtle"
          title="No active trips"
          description="Create a trip to generate a shareable manual and invite your house sitter."
          cta="New Trip"
          onCta={() => router.push("/dashboard/trips")}
        />
      );
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl text-text-primary leading-tight">
          Welcome, {displayName}
        </h1>
        <p className="font-body text-sm text-text-secondary mt-1.5">
          Here&rsquo;s your pets and home at a glance
        </p>
      </div>

      <section aria-labelledby="property-heading">
        <h2
          id="property-heading"
          className="font-body text-base font-semibold text-text-primary mb-3"
        >
          My Property
        </h2>
        <div className="flex items-center gap-2 mb-3">
          {[
            { label: "Pets", href: "/dashboard/property/pets", icon: "🐾" },
            { label: "Sections", href: "/dashboard/property/sections", icon: "📋" },
            { label: "Contacts", href: "/dashboard/property/contacts", icon: "📞" },
            { label: "Vault", href: "/dashboard/property/vault", icon: "🔐" },
          ].map(({ label, href, icon }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-bg-sunken border border-border-default font-body text-xs text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors duration-150"
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </Link>
          ))}
        </div>
        {propertyContent}

        {/* Setup progress card for incomplete properties */}
        {property && manualSummary && (() => {
          const areas = [
            { label: "Pets", done: (manualSummary.petCount ?? 0) > 0 },
            { label: "Sections", done: (manualSummary.sectionCount ?? 0) > 0 },
            { label: "Contacts", done: (manualSummary.contactCount ?? 0) > 0 },
            { label: "Vault", done: (manualSummary.vaultItemCount ?? 0) > 0 },
          ];
          const completedCount = areas.filter((a) => a.done).length;
          if (completedCount >= areas.length) return null;
          const pct = Math.round((completedCount / areas.length) * 100);
          return (
            <div
              className="bg-accent-subtle border border-accent-light rounded-xl p-4 flex flex-col gap-3 mt-3"
            >
              <div className="flex items-center justify-between">
                <p className="font-body text-sm font-semibold text-text-primary">
                  Your manual is {pct}% complete
                </p>
                <Link
                  href="/setup/pets"
                  className="font-body text-xs font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
                >
                  Continue setup →
                </Link>
              </div>
              <div className="h-1.5 bg-bg rounded-pill overflow-hidden">
                <div
                  className="h-full bg-accent rounded-pill transition-[width] duration-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {areas.map(({ label, done }) => (
                  <span
                    key={label}
                    className={`font-body text-xs font-semibold px-2 py-0.5 rounded-pill ${
                      done
                        ? "bg-secondary-light text-secondary"
                        : "bg-bg-sunken text-text-muted"
                    }`}
                  >
                    {done ? "✓" : "○"} {label}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}
      </section>

      {tripContent && (
        <section aria-labelledby="trip-heading">
          <h2
            id="trip-heading"
            className="font-body text-base font-semibold text-text-primary mb-3"
          >
            Trips
          </h2>
          {tripContent}
        </section>
      )}

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

// ── Push Notification Banner ───────────────────────────────────────────

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
        <BellIcon size={18} />
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

// ── Loading Screen ────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center">
      <p className="font-body text-text-muted">Loading…</p>
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────

export default function DashboardPageClient() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showPublishedBanner, setShowPublishedBanner] = useState(false);

  const storePushSubscription = useMutation(api.users.storePushSubscription);
  const updateTimezone = useMutation(api.users.updateTimezone);

  const dashboardSessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (dashboardSessionData && !dashboardSessionData.hasCompletedOnboarding) {
      router.replace("/welcome");
    }
  }, [dashboardSessionData, router]);

  // Sync browser timezone to user profile for localized notifications
  useEffect(() => {
    if (!mounted || isLoading || !user) return;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) updateTimezone({ token: user.token, timezone: tz });
    } catch {
      // Intl not available — skip
    }
  }, [mounted, isLoading, user, updateTimezone]);

  useEffect(() => {
    if (searchParams.get("published") === "true") {
      setShowPublishedBanner(true);
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.replace("/login");
    }
  }, [mounted, user, isLoading, router]);

  // Redirect unverified email users to check-email
  useEffect(() => {
    if (dashboardSessionData && !dashboardSessionData.emailVerified) {
      router.replace("/check-email");
    }
  }, [dashboardSessionData, router]);

  // Push banner deferred — shown only after user has set up a property.
  // The DashboardOverview triggers it via sessionStorage when property exists.
  useEffect(() => {
    if (!mounted || isLoading || !user) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "denied") return;
    if (sessionStorage.getItem("push_banner_dismissed")) return;
    // Defer push banner until after wizard completion (property exists)
    if (!sessionStorage.getItem("has_property")) return;
    if (Notification.permission === "default") {
      setShowPushBanner(true);
      return;
    }
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

  if (!mounted || isLoading || !user) {
    return <LoadingScreen />;
  }

  return (
    <CreatorLayout>
      <div className="flex flex-col gap-6">
        <NotificationToast
          variant="success"
          title="Home setup complete!"
          message="Your care manual is ready. Create a trip to share it with your sitter."
          visible={showPublishedBanner}
          autoDismissMs={6000}
          onDismiss={() => setShowPublishedBanner(false)}
        />
        {showPushBanner && (
          <PushNotificationBanner
            onEnable={handleEnablePush}
            onDismiss={handleDismissPush}
            isSubscribing={isSubscribing}
          />
        )}
        <DashboardOverview email={user.email} token={user.token} />
      </div>
    </CreatorLayout>
  );
}
