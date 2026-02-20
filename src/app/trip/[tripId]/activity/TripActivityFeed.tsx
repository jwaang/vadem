"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import { ActivityFeedItem, type ActivityType } from "@/components/ui/ActivityFeedItem";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const PAGE_SIZE = 20;

type FeedFilter = "all" | "task_completed" | "proof_uploaded" | "vault_accessed" | "link_opened";

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
  if (event === "trip_started") return "trip started";
  if (event === "trip_expired") return "trip expired";
  return event.replace(/_/g, " ");
}

const chips: { label: string; value: FeedFilter }[] = [
  { label: "All", value: "all" },
  { label: "Tasks", value: "task_completed" },
  { label: "Proof", value: "proof_uploaded" },
  { label: "Vault", value: "vault_accessed" },
];

// ── Inner component (uses Convex hooks) ────────────────────────────────────────

const VALID_FILTERS: FeedFilter[] = [
  "all",
  "task_completed",
  "proof_uploaded",
  "vault_accessed",
  "link_opened",
];

function TripActivityFeedInner({ tripId }: { tripId: Id<"trips"> }) {
  const searchParams = useSearchParams();
  const rawFilter = searchParams.get("filter");
  const initialFilter: FeedFilter = VALID_FILTERS.includes(rawFilter as FeedFilter)
    ? (rawFilter as FeedFilter)
    : "all";
  const [filter, setFilter] = useState<FeedFilter>(initialFilter);
  const [numItems, setNumItems] = useState(PAGE_SIZE);

  const trip = useQuery(api.trips.get, { tripId });

  const result = useQuery(api.activityLog.getActivityForTrip, {
    tripId,
    eventType: filter === "all" ? undefined : filter,
    paginationOpts: { numItems, cursor: null },
  });

  const events = result?.items ?? [];
  const isDone = result?.isDone ?? false;

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-bg-raised border-b border-border-default px-4 py-4 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
        >
          ← Dashboard
        </Link>
        <span className="text-border-strong">|</span>
        <h1 className="font-body text-sm font-semibold text-text-primary">
          Activity Feed
        </h1>
      </header>

      {/* Trip metadata strip */}
      {trip && (
        <div className="bg-bg-raised border-b border-border-default px-4 py-3">
          <p className="font-body text-xs text-text-secondary">
            {trip.startDate} → {trip.endDate}
            <span
              className={[
                "ml-2 font-semibold",
                trip.status === "active" ? "text-secondary" : "text-text-muted",
              ].join(" ")}
            >
              {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
            </span>
          </p>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 px-4 py-6">
        <div className="max-w-lg mx-auto flex flex-col gap-6">
          <h2 className="font-display text-3xl text-text-primary leading-tight">
            Activity
          </h2>

          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {chips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => {
                  setFilter(chip.value);
                  setNumItems(PAGE_SIZE);
                }}
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

          {/* Feed card */}
          <div
            className="bg-bg-raised rounded-xl border border-border-default"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            {result === undefined ? (
              <p className="font-body text-xs text-text-muted px-5 py-4">
                Loading activity…
              </p>
            ) : events.length === 0 ? (
              <p className="font-body text-xs text-text-muted px-5 py-4">
                {filter === "all"
                  ? "No activity recorded yet for this trip."
                  : `No ${chips.find((c) => c.value === filter)?.label.toLowerCase()} events yet.`}
              </p>
            ) : (
              <div className="px-5 pt-2 pb-1">
                {events.map((event, index) => {
                  const isLast = index === events.length - 1;
                  return (
                    <ActivityFeedItem
                      key={event._id}
                      type={eventToActivityType(event.eventType)}
                      name={event.sitterName ?? "Sitter"}
                      action={eventToAction(event.eventType, event.vaultItemLabel, event.taskTitle)}
                      timestamp={formatActivityTimestamp(event.createdAt)}
                      hideBorder={isLast && isDone}
                      proofPhotoUrl={event.proofPhotoUrl}
                    />
                  );
                })}

                {/* Load more */}
                {!isDone && (
                  <div className="py-3 border-t border-border-default">
                    <button
                      type="button"
                      onClick={() => setNumItems((n) => n + PAGE_SIZE)}
                      className="font-body text-xs font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Default export (env guard) ─────────────────────────────────────────────────

export default function TripActivityFeed({ tripId }: { tripId: string }) {
  if (!CONVEX_URL) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-sm text-text-muted">
          Configuration error: Convex URL not set.
        </p>
      </div>
    );
  }
  return <TripActivityFeedInner tripId={tripId as Id<"trips">} />;
}
