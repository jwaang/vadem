"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { TripSetupHeader } from "@/components/ui/TripSetupHeader";

// ── Constants ──────────────────────────────────────────────────────────────────

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

const STEPS = [
  { label: "Details", active: true, href: "details" },
  { label: "One-Time Tasks", active: false, href: "overlay" },
  { label: "Sitters", active: false, href: "sitters" },
  { label: "Proof Settings", active: false, href: "proof" },
  { label: "Share", active: false, href: "share" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTripDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Main details step ──────────────────────────────────────────────────────────

function DetailsStep({ tripId }: { tripId: Id<"trips"> }) {
  const router = useRouter();
  const trip = useQuery(api.trips.get, { tripId });
  const updateTripDetails = useMutation(api.trips.updateTripDetails);

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const outOfRangeItems = useQuery(
    api.overlayItems.listOutOfRangeByTrip,
    trip && startDate && endDate && endDate > startDate
      ? { tripId, startDate, endDate }
      : "skip",
  );

  // Seed form from trip data
  useEffect(() => {
    if (trip && !seeded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(trip.name ?? "");
      setStartDate(trip.startDate);
      setEndDate(trip.endDate);
      setStartTime(trip.startTime ?? "");
      setEndTime(trip.endTime ?? "");
      setSeeded(true);
    }
  }, [trip, seeded]);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  async function handleSave() {
    if (!name.trim()) {
      setError("Please enter a trip name.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Please select both a start date and an end date.");
      return;
    }
    if (endDate <= startDate) {
      setError("End date must be after start date.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await updateTripDetails({
        tripId,
        name: name.trim(),
        startDate,
        endDate,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      });
      router.push(`/trip/${tripId}/overlay`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save details.";
      setError(msg);
      setIsSaving(false);
    }
  }

  if (trip === undefined) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-text-muted">Loading…</p>
      </div>
    );
  }

  if (trip === null) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-sm text-danger">Trip not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Header */}
      <TripSetupHeader tripId={tripId} />

      {/* Step indicator */}
      <div className="bg-bg-raised border-b border-border-default px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-2 overflow-x-auto">
          {STEPS.map(({ label, active, href }, i) => (
            <div key={label} className="flex items-center gap-2 shrink-0">
              {i > 0 && (
                <span className="text-border-strong font-body text-xs">→</span>
              )}
              {active ? (
                <span className="font-body text-xs font-semibold px-3 py-1 rounded-pill bg-accent text-text-on-primary">
                  {label}
                </span>
              ) : (
                <a
                  href={`/trip/${tripId}/${href}`}
                  className="font-body text-xs font-semibold px-3 py-1 rounded-pill text-text-muted bg-bg-sunken hover:text-text-secondary hover:bg-border-default transition-colors duration-150"
                >
                  {label}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto flex flex-col gap-6">
          {/* Heading */}
          <div>
            <h2 className="font-display text-3xl text-text-primary leading-tight">
              Trip details
            </h2>
            <p className="font-body text-sm text-text-secondary mt-2">
              Give your trip a name and set your travel dates. Your sitter will
              see these details in the care manual.
            </p>
          </div>

          {/* Form card */}
          <div
            className="bg-bg-raised rounded-xl border border-border-default p-5 flex flex-col gap-4"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            {/* Trip name */}
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
                  setError("");
                }}
                placeholder="e.g. Spring Break 2026"
                className="w-full font-body text-sm text-text-primary bg-bg-raised border-[1.5px] border-border-default rounded-md px-3 py-2.5 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-text-muted focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-subtle)]"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="Start date"
                id="details-start-date"
                value={startDate}
                min={trip.status === "draft" ? today : undefined}
                onChange={(v) => {
                  setStartDate(v);
                  setError("");
                }}
                required
              />
              <DatePicker
                label="End date"
                id="details-end-date"
                value={endDate}
                min={startDate || today}
                onChange={(v) => {
                  setEndDate(v);
                  setError("");
                }}
                required
              />
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <TimePicker
                label="Start time"
                id="details-start-time"
                value={startTime}
                onChange={setStartTime}
                hint="Optional"
              />
              <TimePicker
                label="End time"
                id="details-end-time"
                value={endTime}
                onChange={setEndTime}
                hint="Optional"
              />
            </div>

            {/* Out-of-range warning */}
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
                    <li>...and {outOfRangeItems.length - 5} more</li>
                  )}
                </ul>
                <p className="font-body text-xs text-warning">
                  These tasks won&apos;t appear for your sitter. You can edit them after saving.
                </p>
              </div>
            )}

            {error && (
              <div role="alert" className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Save + Next */}
          <div className="flex items-center justify-end">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save & Continue →"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Default export (env guard) ─────────────────────────────────────────────────

export default function DetailsStepInner({ tripId }: { tripId: string }) {
  if (!CONVEX_URL) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-sm text-text-muted">
          Configuration error: Convex URL not set.
        </p>
      </div>
    );
  }
  return <DetailsStep tripId={tripId as Id<"trips">} />;
}
