"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { LocationCardUploader } from "@/components/ui/LocationCardUploader";
import { LocationCardVideoUploader } from "@/components/ui/LocationCardVideoUploader";

// ── Constants ──────────────────────────────────────────────────────────────────

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

type TimeSlot = "morning" | "afternoon" | "evening" | "anytime";

const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Anytime",
};

const STEPS = [
  { label: "Overlay Items", active: true, href: "overlay" },
  { label: "Sitters", active: false, href: "sitters" },
  { label: "Proof Settings", active: false, href: "proof" },
  { label: "Share", active: false, href: "share" },
];

// ── Icons ──────────────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function CameraIcon() {
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
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

// ── Saved item row ─────────────────────────────────────────────────────────────

interface SavedItemRowProps {
  item: {
    _id: Id<"overlayItems">;
    text: string;
    date?: string;
    timeSlot: TimeSlot;
    proofRequired: boolean;
    locationCardId?: Id<"locationCards">;
  };
  onDelete: (id: Id<"overlayItems">) => void;
}

function SavedItemRow({ item, onDelete }: SavedItemRowProps) {
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);
  const [showVideoUploader, setShowVideoUploader] = useState(false);

  // Live query — drives attached state reactively after upload/reload
  const existingCards = useQuery(api.locationCards.listByParent, {
    parentId: item._id,
    parentType: "overlayItem",
  });
  const attachedCard = existingCards?.[0] ?? null;
  const photoAttached = !!item.locationCardId || (attachedCard !== null);

  return (
    <>
      <div className="bg-bg-raised rounded-lg border border-border-default p-4 flex flex-col gap-3">
        {/* Item text + delete */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-medium text-text-primary leading-snug">
              {item.text}
            </p>
          </div>
          <button
            onClick={() => onDelete(item._id)}
            className="text-text-muted hover:text-danger transition-colors duration-150 shrink-0 mt-0.5"
            aria-label="Delete item"
          >
            <TrashIcon />
          </button>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-pill bg-accent-light text-accent border border-accent">
            ✦ This Trip Only
          </span>
          {item.timeSlot !== "anytime" && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-pill bg-bg-sunken text-text-secondary">
              {TIME_SLOT_LABELS[item.timeSlot]}
            </span>
          )}
          {item.date && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-pill bg-bg-sunken text-text-secondary">
              {item.date}
            </span>
          )}
        </div>

        {/* Location card — inline preview when attached, attach button when not */}
        {photoAttached && attachedCard ? (
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-bg-sunken border border-border-default">
            {/* Thumbnail */}
            {attachedCard.resolvedPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attachedCard.resolvedPhotoUrl}
                alt="Location card"
                className="w-14 h-14 object-cover rounded-md shrink-0 border border-border-default"
              />
            ) : (
              <div className="w-14 h-14 rounded-md bg-bg border border-dashed border-border-strong shrink-0 flex items-center justify-center text-text-muted">
                <CameraIcon />
              </div>
            )}

            {/* Caption + room */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              {attachedCard.caption ? (
                <p className="font-handwritten text-base leading-snug text-text-primary truncate">
                  {attachedCard.caption}
                </p>
              ) : (
                <p className="font-body text-xs text-text-muted italic">No caption</p>
              )}
              {attachedCard.roomTag && (
                <span className="font-body text-xs font-semibold text-text-muted">
                  {attachedCard.roomTag}
                </span>
              )}
            </div>

            {/* Edit button */}
            <button
              type="button"
              onClick={() => setShowPhotoUploader(true)}
              className="shrink-0 font-body text-xs font-semibold text-primary hover:text-primary-hover transition-colors duration-150 px-2 py-1 rounded-md hover:bg-primary-subtle"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPhotoUploader(true)}
              className="inline-flex items-center gap-1.5 font-body text-xs text-text-muted hover:text-primary transition-colors duration-150"
            >
              + Photo card
            </button>
            <button
              onClick={() => setShowVideoUploader(true)}
              className="inline-flex items-center gap-1.5 font-body text-xs text-text-muted hover:text-primary transition-colors duration-150"
            >
              + Video card
            </button>
          </div>
        )}
      </div>

      {/* Photo uploader modal */}
      {showPhotoUploader && (
        <LocationCardUploader
          parentId={item._id}
          parentType="overlayItem"
          onSuccess={() => setShowPhotoUploader(false)}
          onClose={() => setShowPhotoUploader(false)}
          existingCardId={attachedCard?._id}
          existingPhotoUrl={attachedCard?.resolvedPhotoUrl}
          existingCaption={attachedCard?.caption}
          existingRoomTag={attachedCard?.roomTag}
        />
      )}
      {/* Video uploader modal */}
      {showVideoUploader && (
        <LocationCardVideoUploader
          parentId={item._id}
          parentType="overlayItem"
          onSuccess={() => setShowVideoUploader(false)}
          onClose={() => setShowVideoUploader(false)}
        />
      )}
    </>
  );
}

// ── Add item form ──────────────────────────────────────────────────────────────

interface AddItemFormProps {
  tripId: Id<"trips">;
  onAdded: () => void;
}

function AddItemForm({ tripId, onAdded }: AddItemFormProps) {
  const createItem = useMutation(api.overlayItems.create);

  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("anytime");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("Please describe the trip-specific task.");
      return;
    }
    setIsAdding(true);
    setError("");
    try {
      await createItem({
        tripId,
        text: text.trim(),
        date: date || undefined,
        timeSlot,
        proofRequired: false,
      });
      // Reset form
      setText("");
      setDate("");
      setTimeSlot("anytime");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item.");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="bg-bg-raised rounded-xl border border-border-default p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-body text-sm font-semibold text-text-primary">
          Add a trip-specific task
        </h3>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-4">
        {/* Text input */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="overlay-text"
            className="font-body text-xs font-semibold text-text-secondary"
          >
            Description
          </label>
          <textarea
            id="overlay-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Give Luna her ear drops twice daily"
            rows={2}
            className="w-full font-body text-sm text-text-primary bg-bg rounded-md px-3 py-2.5 resize-none outline-none transition-[border-color,box-shadow] duration-150"
            style={{
              border: "1.5px solid var(--border-default)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.boxShadow =
                "0 0 0 3px var(--primary-subtle)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        {/* Date + Time slot row */}
        <div className="grid grid-cols-2 gap-3">
          <DatePicker
            label="Specific date"
            id="overlay-date"
            value={date}
            onChange={setDate}
            placeholder="Leave empty for all days"
            hint="Leave empty to apply all days"
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="overlay-slot"
              className="font-body text-xs font-semibold text-text-secondary"
            >
              Time slot
            </label>
            <select
              id="overlay-slot"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value as TimeSlot)}
              className="w-full font-body text-sm text-text-primary bg-bg rounded-md px-3 py-2.5 outline-none transition-[border-color,box-shadow] duration-150"
              style={{
                border: "1.5px solid var(--border-default)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px var(--primary-subtle)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <option value="anytime">Anytime</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="font-body text-xs text-danger bg-danger-light rounded-md px-3 py-2"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={isAdding || !text.trim()}
        >
          {isAdding ? "Adding…" : "Add item"}
        </Button>
      </form>
    </div>
  );
}

// ── Inner component (requires ConvexProvider) ──────────────────────────────────

function OverlayStep({ tripId }: { tripId: Id<"trips"> }) {
  const router = useRouter();
  const items = useQuery(api.overlayItems.listByTrip, { tripId });
  const removeItem = useMutation(api.overlayItems.remove);

  const [deletingId, setDeletingId] = useState<Id<"overlayItems"> | null>(null);

  async function handleDelete(id: Id<"overlayItems">) {
    setDeletingId(id);
    try {
      await removeItem({ overlayItemId: id });
    } finally {
      setDeletingId(null);
    }
  }

  function handleContinue() {
    router.push(`/trip/${tripId}/sitters`);
  }

  const hasItems = items && items.length > 0;

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-bg-raised border-b border-border-default px-4 py-4 flex items-center gap-3">
        <a
          href="/dashboard/trips"
          className="font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
        >
          ← Trips
        </a>
        <span className="text-border-strong">|</span>
        <h1 className="font-body text-sm font-semibold text-text-primary">
          Trip Setup
        </h1>
      </header>

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
              Anything different this trip?
            </h2>
            <p className="font-body text-sm text-text-secondary mt-2">
              Add trip-specific tasks that don&apos;t belong in your permanent
              manual — one-time reminders, special instructions, or anything
              different from your usual routine.
            </p>
          </div>

          {/* Saved items list */}
          {hasItems && (
            <div className="flex flex-col gap-3">
              <h3 className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
                Added items ({items.length})
              </h3>
              {items.map((item) => (
                <SavedItemRow
                  key={item._id}
                  item={{
                    _id: item._id,
                    text: item.text,
                    date: item.date,
                    timeSlot: item.timeSlot as TimeSlot,
                    proofRequired: item.proofRequired,
                    locationCardId: item.locationCardId,
                  }}
                  onDelete={handleDelete}
                />
              ))}
              {deletingId && (
                <p className="font-body text-xs text-text-muted text-center">
                  Deleting…
                </p>
              )}
            </div>
          )}

          {/* Add item form */}
          <AddItemForm tripId={tripId} onAdded={() => { }} />

          {/* Continue */}
          <div className="flex items-center justify-end pt-2">
            <Button variant="primary" onClick={handleContinue}>
              Continue →
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Default export (env guard) ─────────────────────────────────────────────────

export default function OverlayStepInner({ tripId }: { tripId: string }) {
  if (!CONVEX_URL) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-sm text-text-muted">
          Configuration error: Convex URL not set.
        </p>
      </div>
    );
  }
  return <OverlayStep tripId={tripId as Id<"trips">} />;
}
