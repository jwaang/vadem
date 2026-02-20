"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const TodayPageInner = dynamic(() => import("./TodayPageInner"), { ssr: false });

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

// ── ShareLink resolver — looks up trip by shareLink slug, falls back to tripId ──

function TodayPageResolver({ shareLink }: { shareLink: string }) {
  const trip = useQuery(api.trips.getByShareLink, { shareLink });

  // Still loading
  if (trip === undefined) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  // Found by shareLink — pass the actual Convex trip ID to the inner component
  if (trip !== null) {
    return <TodayPageInner tripId={trip._id} />;
  }

  // Not a shareLink — treat the param as a direct Convex trip ID (backward compat)
  return <TodayPageInner tripId={shareLink} />;
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
