"use client";

import { Component, useState, useEffect, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { saveTripMeta, loadTripMeta } from "@/lib/offlineTripData";

const TodayPageInner = dynamic(() => import("./TodayPageInner"), { ssr: false });
const PasswordGate = dynamic(
  () => import("./PasswordGate").then((m) => ({ default: m.PasswordGate })),
  { ssr: false },
);

// ── Cookie helpers ─────────────────────────────────────────────────────

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? (match.split("=")[1] ?? null) : null;
}

// ── Date formatting helper ─────────────────────────────────────────────

function formatStartDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year!, month! - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Offline detection ─────────────────────────────────────────────────

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
function getOnlineSnapshot() {
  return navigator.onLine;
}
function getServerSnapshot() {
  return true; // SSR assumes online
}

function useIsOffline(): boolean {
  const online = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerSnapshot);
  return !online;
}

// ── Offline fallback screen ──────────────────────────────────────────

function OfflineNoCache() {
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-6">
      <div
        className="bg-bg-raised rounded-xl p-8 flex flex-col items-center gap-4 w-full max-w-sm text-center"
        style={{ boxShadow: "var(--shadow-md)" }}
      >
        <div className="w-12 h-12 rounded-round bg-bg-sunken flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-muted"
            aria-hidden="true"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <h1 className="font-display text-2xl text-text-primary">
          You&apos;re offline
        </h1>
        <p className="font-body text-sm text-text-muted">
          Connect to the internet to load this trip for the first time. Once loaded, it will be available offline.
        </p>
      </div>
    </div>
  );
}

// ── Error boundary — catches query / validation errors (e.g. malformed trip ID) ──

interface ErrorBoundaryState {
  hasError: boolean;
}

class TodayErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-bg flex items-center justify-center p-6">
          <div className="text-center flex flex-col gap-3">
            <p className="font-display text-2xl text-text-primary">Trip not found</p>
            <p className="font-body text-sm text-text-muted">
              This link may have expired or been revoked.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Post-trip conversion card ──────────────────────────────────────────

function ConversionCard({ tripId }: { tripId?: Id<"trips"> }) {
  const signupHref = tripId ? `/signup?ref=${tripId}` : "/signup";
  return (
    <div
      className="bg-bg-raised rounded-xl p-8 flex flex-col items-center gap-4 w-full max-w-sm text-center"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      <h2 className="font-display text-2xl text-text-primary italic">
        Loved using Vadem?
      </h2>
      <p className="font-body text-sm text-text-secondary">
        Create one for your own home.
      </p>
      <Link
        href={signupHref}
        className="btn btn-primary inline-flex items-center justify-center font-body text-sm font-medium text-text-on-primary bg-primary rounded-lg px-6 py-3 w-full max-w-[220px]"
      >
        Create your Vadem
      </Link>
    </div>
  );
}

// ── Expired state ──────────────────────────────────────────────────────

function ExpiredState({ tripId }: { tripId?: Id<"trips"> }) {
  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center gap-5 p-6">
      {/* Conversion card — shown first, warm and editorial */}
      <ConversionCard tripId={tripId} />

      {/* Expired notice */}
      <div
        className="bg-bg-raised rounded-xl p-8 flex flex-col items-center gap-4 w-full max-w-sm text-center"
        style={{ boxShadow: "var(--shadow-md)" }}
      >
        {/* Clock icon */}
        <div className="w-12 h-12 rounded-round bg-bg-sunken flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-muted"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h1 className="font-display text-2xl text-text-primary">
          This vadem has ended
        </h1>
        <p className="font-body text-sm text-text-muted">
          This link is no longer active. Please contact the homeowner if you
          need access.
        </p>
      </div>
    </div>
  );
}

// ── Not started state ──────────────────────────────────────────────────

interface NotStartedStateProps {
  startDate: string;
  propertyName: string;
  petNames: string[];
}

function NotStartedState({ startDate, propertyName, petNames }: NotStartedStateProps) {
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-6">
      <div
        className="bg-bg-raised rounded-xl p-8 flex flex-col items-center gap-5 w-full max-w-sm text-center"
        style={{ boxShadow: "var(--shadow-md)" }}
      >
        {/* Calendar icon */}
        <div className="w-12 h-12 rounded-round bg-primary-subtle flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>

        <h1 className="font-display text-2xl text-text-primary">{propertyName}</h1>

        <p className="font-body text-sm text-text-muted">
          Your stay starts{" "}
          <span className="font-semibold text-text-secondary">
            {formatStartDate(startDate)}
          </span>
        </p>

        {petNames.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {petNames.map((name) => (
              <span
                key={name}
                className="font-body text-xs font-medium text-secondary bg-secondary-light rounded-pill px-3 py-1"
              >
                {name}
              </span>
            ))}
          </div>
        )}

        <p className="font-body text-xs text-text-muted">
          Check back on your start date to see your care instructions.
        </p>
      </div>
    </div>
  );
}

// ── Post-auth trip view — used after password verification ─────────────
// Determines NOT_STARTED vs ACTIVE without checking password again.

function PostAuthTripView({ tripId, shareLink }: { tripId: Id<"trips">; shareLink: string }) {
  const state = useQuery(api.trips.getSitterTripState, { tripId });
  const isOffline = useIsOffline();

  if (state === undefined) {
    // Offline: skip the loading gate — TodayPageInner handles its own cache
    if (isOffline) {
      return <TodayPageInner tripId={tripId} shareLink={shareLink} />;
    }
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  if (state === null || state.status === "EXPIRED") {
    return <ExpiredState tripId={tripId} />;
  }

  if (state.status === "NOT_STARTED") {
    return (
      <NotStartedState
        startDate={state.startDate}
        propertyName={state.propertyName}
        petNames={state.petNames}
      />
    );
  }

  // ACTIVE
  return <TodayPageInner tripId={tripId} shareLink={shareLink} />;
}

// ── Password-protected resolver ────────────────────────────────────────

interface PasswordProtectedResolverProps {
  tripId: Id<"trips">;
  shareLink: string;
}

function PasswordProtectedResolver({ tripId, shareLink }: PasswordProtectedResolverProps) {
  const cookieName = `vadem_trip_${shareLink}`;
  const storedToken = getCookie(cookieName);
  const isOffline = useIsOffline();

  const [verified, setVerified] = useState(false);

  // Validate the stored session token against the server
  const sessionValid = useQuery(
    api.tripSessions.verifySession,
    storedToken ? { sessionToken: storedToken, tripId } : "skip",
  );

  // While validating the stored token
  if (storedToken && sessionValid === undefined) {
    // Offline + cookie exists: trust it — sitter previously authenticated
    if (isOffline) {
      return <PostAuthTripView tripId={tripId} shareLink={shareLink} />;
    }
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  // Valid stored session OR just verified via password form
  if (verified || sessionValid === true) {
    return <PostAuthTripView tripId={tripId} shareLink={shareLink} />;
  }

  // No valid session — show password gate
  return (
    <PasswordGate
      tripId={tripId}
      shareLink={shareLink}
      onSuccess={() => setVerified(true)}
    />
  );
}

// ── ShareLink resolver — state machine routing ─────────────────────────

function TodayPageResolver({ shareLink }: { shareLink: string }) {
  const state = useQuery(api.trips.getTripByShareLink, { shareLink });
  const isOffline = useIsOffline();

  // Cache trip metadata whenever we get a successful response
  useEffect(() => {
    if (state && "tripId" in state && state.tripId) {
      saveTripMeta(shareLink, {
        tripId: state.tripId,
        status: state.status as "ACTIVE" | "PASSWORD_REQUIRED" | "NOT_STARTED" | "EXPIRED",
        passwordRequired: state.status === "PASSWORD_REQUIRED",
        startDate: "startDate" in state ? state.startDate : undefined,
        propertyName: "propertyName" in state ? state.propertyName : undefined,
        petNames: "petNames" in state ? state.petNames : undefined,
      });
    }
  }, [state, shareLink]);

  // Store tripId in sessionStorage for attribution when trip is active
  useEffect(() => {
    if (state && "tripId" in state && state.tripId && state.status === "ACTIVE") {
      try {
        sessionStorage.setItem("vadem_origin_trip_id", state.tripId);
      } catch {
        // sessionStorage may be unavailable in private browsing
      }
    }
  }, [state]);

  // Still loading — use offline cache if available
  if (state === undefined) {
    if (isOffline) {
      const cached = loadTripMeta(shareLink);
      if (cached) {
        const tripId = cached.tripId as Id<"trips">;
        if (cached.status === "ACTIVE") {
          return <TodayPageInner tripId={tripId} shareLink={shareLink} />;
        }
        if (cached.status === "PASSWORD_REQUIRED") {
          return <PasswordProtectedResolver tripId={tripId} shareLink={shareLink} />;
        }
        if (cached.status === "NOT_STARTED" && cached.startDate && cached.propertyName) {
          return (
            <NotStartedState
              startDate={cached.startDate}
              propertyName={cached.propertyName}
              petNames={cached.petNames ?? []}
            />
          );
        }
        if (cached.status === "EXPIRED") {
          return <ExpiredState tripId={tripId} />;
        }
      }
      // No cache — show offline message instead of infinite loading
      return <OfflineNoCache />;
    }
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  // Not found / revoked
  if (state === null) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center p-6">
        <div
          className="bg-bg-raised rounded-xl p-8 flex flex-col items-center gap-4 w-full max-w-sm text-center"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <div className="w-12 h-12 rounded-round bg-bg-sunken flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-muted"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-text-primary">
            This link is no longer valid
          </h1>
          <p className="font-body text-sm text-text-muted">
            This link has been revoked. Please ask the homeowner for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "EXPIRED") {
    return <ExpiredState tripId={state.tripId} />;
  }

  if (state.status === "PASSWORD_REQUIRED") {
    return <PasswordProtectedResolver tripId={state.tripId} shareLink={shareLink} />;
  }

  if (state.status === "NOT_STARTED") {
    return (
      <NotStartedState
        startDate={state.startDate}
        propertyName={state.propertyName}
        petNames={state.petNames}
      />
    );
  }

  // ACTIVE
  return <TodayPageInner tripId={state.tripId} shareLink={shareLink} />;
}

// ── Client shell ──────────────────────────────────────────────────────

export function TodayPageClient({ tripId }: { tripId: string }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center p-6">
        <p className="font-body text-sm text-text-muted text-center">
          Unable to load trip. Please try again later.
        </p>
      </div>
    );
  }
  return (
    <TodayErrorBoundary>
      <TodayPageResolver shareLink={tripId} />
    </TodayErrorBoundary>
  );
}
