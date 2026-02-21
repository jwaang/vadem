"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  ActivityFeedItem,
  type ActivityType,
} from "@/components/ui/ActivityFeedItem";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

function eventToAction(
  event: string,
  vaultItemLabel?: string,
  taskTitle?: string,
): string {
  if (event === "link_opened") return "opened the sitter link";
  if (event === "vault_accessed") {
    return vaultItemLabel
      ? `accessed your ${vaultItemLabel}`
      : "accessed a vault item";
  }
  if (event === "task_completed")
    return taskTitle ? `completed "${taskTitle}"` : "completed a task";
  if (event === "proof_uploaded")
    return taskTitle
      ? `submitted proof for "${taskTitle}"`
      : "submitted a proof photo";
  if (event === "task_unchecked")
    return taskTitle
      ? `unmarked "${taskTitle}" as complete`
      : "unmarked a task as complete";
  if (event === "trip_started") return "trip started";
  if (event === "trip_expired") return "trip expired";
  return event.replace(/_/g, " ");
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function LockIcon() {
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
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ── Proof Photo Grid ──────────────────────────────────────────────────────────

interface ProofPhoto {
  url: string;
  taskText: string;
  sitterName: string;
  completedAt: number;
}

function ProofPhotoGrid({ photos }: { photos: ProofPhoto[] }) {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveUrl(photo.url)}
            className="group rounded-md overflow-hidden border border-border-default bg-bg-raised flex flex-col gap-0 text-left hover:shadow-md transition-[box-shadow] duration-250"
            aria-label={`View proof photo for ${photo.taskText}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={`Proof for ${photo.taskText}`}
              className="w-full h-[120px] object-cover"
            />
            <div className="px-2.5 py-2">
              <p className="font-body text-xs font-semibold text-text-primary truncate">
                {photo.taskText}
              </p>
              <p className="font-body text-xs text-text-muted truncate">
                {photo.sitterName} · {formatTimestamp(photo.completedAt)}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Full-screen viewer */}
      {activeUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setActiveUrl(null)}
          role="dialog"
          aria-label="Proof photo full view"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeUrl}
            alt="Proof photo full size"
            className="max-w-full max-h-full object-contain"
            style={{ touchAction: "pinch-zoom" }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute top-4 right-4 w-9 h-9 rounded-round bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors duration-150"
            onClick={() => setActiveUrl(null)}
            aria-label="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

// ── Main Report Share View (inner — uses Convex hooks) ────────────────────────

function ReportShareViewInner({
  reportShareLink,
}: {
  reportShareLink: string;
}) {
  const report = useQuery(api.reports.getTripReportByShareLink, {
    reportShareLink,
  });

  if (report === undefined) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-text-muted">Loading report…</p>
      </div>
    );
  }

  if (report === null) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <div className="text-center px-4">
          <p className="font-body text-text-primary font-semibold mb-2">
            Report not found
          </p>
          <p className="font-body text-sm text-text-muted">
            This report link may have been revoked or does not exist.
          </p>
        </div>
      </div>
    );
  }

  const { trip, tasks, overlayItems, vaultAccessLog, activityTimeline } =
    report;

  const allTasks = [...tasks, ...overlayItems];
  const doneCount = allTasks.filter((t) => t.completions.length > 0).length;
  const totalCount = allTasks.length;

  const proofPhotos: ProofPhoto[] = allTasks.flatMap((task) =>
    task.completions
      .filter((c) => !!c.proofPhotoUrl)
      .map((c) => ({
        url: c.proofPhotoUrl!,
        taskText: task.text,
        sitterName: c.sitterName,
        completedAt: c.completedAt,
      })),
  );

  const statusLabel =
    trip.status === "completed"
      ? "Completed"
      : trip.status === "expired"
        ? "Expired"
        : trip.status === "active"
          ? "Active"
          : "Draft";

  return (
    <div className="min-h-dvh bg-bg">
      {/* Simple header */}
      <header className="bg-bg-raised border-b border-border-default px-4 sm:px-6 py-3">
        <span className="font-display text-xl text-text-primary">Vadem</span>
      </header>

      <main className="max-w-[640px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        {/* Page header */}
        <div>
          <h1 className="font-display text-4xl text-text-primary leading-tight">
            Trip Report
          </h1>
          <p className="font-body text-sm text-text-secondary mt-1.5">
            {trip.startDate} → {trip.endDate}
          </p>
        </div>

        {/* 1. Summary card */}
        <section aria-labelledby="summary-heading">
          <div
            className="bg-bg-raised rounded-xl border border-border-default p-6 flex flex-col gap-5"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <h2
              id="summary-heading"
              className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide"
            >
              Summary
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <p className="font-body text-xs text-text-muted">Dates</p>
                <p className="font-body text-sm font-semibold text-text-primary mt-0.5">
                  {trip.startDate} – {trip.endDate}
                </p>
              </div>
              <div>
                <p className="font-body text-xs text-text-muted">Status</p>
                <p className="font-body text-sm font-semibold text-text-primary mt-0.5">
                  {statusLabel}
                </p>
              </div>
              <div>
                <p className="font-body text-xs text-text-muted">Sitters</p>
                <p className="font-body text-sm font-semibold text-text-primary mt-0.5">
                  {trip.sitters.length > 0
                    ? trip.sitters.map((s) => s.name).join(", ")
                    : "None added"}
                </p>
              </div>
              <div>
                <p className="font-body text-xs text-text-muted">
                  Tasks completed
                </p>
                <p className="font-body text-sm font-semibold text-text-primary mt-0.5">
                  {doneCount} / {totalCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Task completion list */}
        <section aria-labelledby="tasks-heading">
          <h2
            id="tasks-heading"
            className="font-body text-base font-semibold text-text-primary mb-3"
          >
            Task Completion
          </h2>
          {allTasks.length === 0 ? (
            <p className="font-body text-sm text-text-muted">
              No tasks for this trip.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {allTasks.map((task) => {
                const isDone = task.completions.length > 0;
                const lastCompletion =
                  task.completions[task.completions.length - 1];
                return (
                  <div
                    key={task.id}
                    className="bg-bg-raised rounded-lg border border-border-default px-4 py-3 flex items-start gap-3"
                    style={{ boxShadow: "var(--shadow-xs)" }}
                  >
                    <span
                      className={[
                        "w-2.5 h-2.5 rounded-round mt-[5px] shrink-0",
                        isDone ? "bg-secondary" : "bg-danger",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <p className="font-body text-sm text-text-primary">
                        {task.text}
                      </p>
                      {isDone ? (
                        <p className="font-body text-xs text-text-muted">
                          Done by {lastCompletion.sitterName} ·{" "}
                          {formatTimestamp(lastCompletion.completedAt)}
                        </p>
                      ) : (
                        <p className="font-body text-xs text-danger">
                          Not completed
                        </p>
                      )}
                    </div>
                    <span
                      className={[
                        "shrink-0 px-2 py-0.5 rounded-pill font-body text-xs font-semibold",
                        isDone
                          ? "bg-secondary-light text-secondary"
                          : "bg-danger-light text-danger",
                      ].join(" ")}
                    >
                      {isDone ? "Done" : "Not done"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Proof photos */}
        {proofPhotos.length > 0 && (
          <section aria-labelledby="proof-heading">
            <h2
              id="proof-heading"
              className="font-body text-base font-semibold text-text-primary mb-3"
            >
              Proof Photos
            </h2>
            <ProofPhotoGrid photos={proofPhotos} />
          </section>
        )}

        {/* 4. Vault access log */}
        {vaultAccessLog.length > 0 && (
          <section aria-labelledby="vault-heading">
            <h2
              id="vault-heading"
              className="font-body text-base font-semibold text-text-primary mb-3"
            >
              Vault Access Log
            </h2>
            <div className="bg-vault-subtle rounded-lg border border-border-default overflow-hidden">
              {vaultAccessLog.map((entry, i) => (
                <div
                  key={i}
                  className={[
                    "px-4 py-3 flex items-center gap-3",
                    i < vaultAccessLog.length - 1
                      ? "border-b border-border-default"
                      : "",
                  ].join(" ")}
                >
                  <span className="text-vault shrink-0">
                    <LockIcon />
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <p className="font-body text-sm font-semibold text-text-primary">
                      {entry.itemLabel}
                    </p>
                    <p className="font-body text-xs text-text-muted">
                      {entry.sitterName ?? "Unknown sitter"} ·{" "}
                      {formatTimestamp(entry.accessedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. Activity timeline */}
        {activityTimeline.length > 0 && (
          <section aria-labelledby="activity-heading">
            <h2
              id="activity-heading"
              className="font-body text-base font-semibold text-text-primary mb-3"
            >
              Activity Timeline
            </h2>
            <div
              className="bg-bg-raised rounded-xl border border-border-default px-4 py-1"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              {activityTimeline.map((event, i) => (
                <ActivityFeedItem
                  key={event._id}
                  type={eventToActivityType(event.eventType)}
                  name={event.sitterName ?? "System"}
                  action={eventToAction(
                    event.eventType,
                    event.vaultItemLabel,
                    event.taskTitle,
                  )}
                  timestamp={formatActivityTimestamp(event.createdAt)}
                  proofPhotoUrl={event.proofPhotoUrl}
                  hideBorder={i === activityTimeline.length - 1}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// ── Export (env guard) ────────────────────────────────────────────────────────

export default function ReportShareView({
  reportShareLink,
}: {
  reportShareLink: string;
}) {
  if (!CONVEX_URL) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-text-muted">Convex not configured.</p>
      </div>
    );
  }
  return <ReportShareViewInner reportShareLink={reportShareLink} />;
}
