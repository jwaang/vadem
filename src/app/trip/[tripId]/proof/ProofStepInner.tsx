"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";

// ── Constants ──────────────────────────────────────────────────────────────────

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

const STEPS = [
  { label: "Overlay Items", active: false },
  { label: "Sitters", active: false },
  { label: "Proof Settings", active: true },
  { label: "Share", active: false },
];

const TIME_SLOT_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Anytime",
};

const TIME_SLOT_ORDER = ["morning", "afternoon", "evening", "anytime"];

// ── Types ──────────────────────────────────────────────────────────────────────

interface TaskItem {
  id: string;
  text: string;
  timeSlot: "morning" | "afternoon" | "evening" | "anytime";
  proofRequired: boolean;
  type: "recurring" | "overlay";
  sectionTitle?: string;
}

// ── Toggle switch ──────────────────────────────────────────────────────────────

function ProofToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 rounded-pill border-2 border-transparent transition-colors duration-250",
        checked ? "bg-secondary" : "bg-border-strong",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 rounded-round bg-white shadow transition-[translate] duration-250",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
      <span className="sr-only">
        {checked ? "Proof required" : "Proof not required"}
      </span>
    </button>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
}: {
  task: TaskItem;
  onToggle: (id: string, type: "recurring" | "overlay", value: boolean) => void;
}) {
  return (
    <div className="bg-bg-raised rounded-lg border border-border-default px-4 py-3 flex items-center gap-3">
      {/* Text + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-body text-sm text-text-primary leading-snug">
            {task.text}
          </span>
          {task.type === "overlay" && (
            <span className="font-body text-xs font-semibold px-2 py-0.5 rounded-pill bg-accent-light text-accent shrink-0">
              ✦ This Trip Only
            </span>
          )}
        </div>
        {task.sectionTitle && (
          <p className="font-body text-xs text-text-muted mt-0.5">
            {task.sectionTitle}
          </p>
        )}
      </div>

      {/* Toggle */}
      <ProofToggle
        checked={task.proofRequired}
        onChange={(v) => onToggle(task.id, task.type, v)}
      />
    </div>
  );
}

// ── Main step component ────────────────────────────────────────────────────────

function ProofStep({ tripId }: { tripId: Id<"trips"> }) {
  const router = useRouter();
  const tasks = useQuery(api.proof.getTasksForTrip, { tripId });
  const updateInstruction = useMutation(api.instructions.update);
  const updateOverlayItem = useMutation(api.overlayItems.update);

  async function handleToggle(
    id: string,
    type: "recurring" | "overlay",
    value: boolean,
  ) {
    if (type === "recurring") {
      await updateInstruction({
        instructionId: id as Id<"instructions">,
        proofRequired: value,
      });
    } else {
      await updateOverlayItem({
        overlayItemId: id as Id<"overlayItems">,
        proofRequired: value,
      });
    }
  }

  function handleContinue() {
    router.push(`/trip/${tripId}/share`);
  }

  // Group tasks by timeSlot
  const grouped: Record<string, TaskItem[]> = {};
  for (const slot of TIME_SLOT_ORDER) {
    const slotTasks = (tasks ?? []).filter((t) => t.timeSlot === slot);
    if (slotTasks.length > 0) {
      grouped[slot] = slotTasks;
    }
  }

  const proofCount = (tasks ?? []).filter((t) => t.proofRequired).length;
  const totalCount = (tasks ?? []).length;
  const isLoading = tasks === undefined;

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-bg-raised border-b border-border-default px-4 py-4 flex items-center gap-3">
        <a
          href={`/trip/${tripId}/sitters`}
          className="font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
        >
          ← Back
        </a>
        <span className="text-border-strong">|</span>
        <h1 className="font-body text-sm font-semibold text-text-primary">
          Trip Setup
        </h1>
      </header>

      {/* Step indicator */}
      <div className="bg-bg-raised border-b border-border-default px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-2 overflow-x-auto">
          {STEPS.map(({ label, active }, i) => (
            <div key={label} className="flex items-center gap-2 shrink-0">
              {i > 0 && (
                <span className="text-border-strong font-body text-xs">→</span>
              )}
              <span
                className={[
                  "font-body text-xs font-semibold px-3 py-1 rounded-pill",
                  active
                    ? "bg-accent text-text-on-primary"
                    : "text-text-muted bg-bg-sunken",
                ].join(" ")}
              >
                {label}
              </span>
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
              Require photo proof?
            </h2>
            <p className="font-body text-sm text-text-secondary mt-2">
              Choose which tasks need a photo from your sitter as confirmation.
            </p>
          </div>

          {/* Proof count + hint */}
          {!isLoading && totalCount > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-body text-sm font-semibold text-text-primary">
                  {proofCount}{" "}
                  {proofCount === 1 ? "task requires" : "tasks require"} proof
                </span>
                {proofCount > 0 && (
                  <span className="font-body text-xs font-semibold px-2 py-0.5 rounded-pill bg-secondary-light text-secondary">
                    {proofCount}
                  </span>
                )}
              </div>
              <p className="font-body text-xs text-text-muted">
                We suggest 1–3 proof items per day
              </p>
            </div>
          )}

          {/* Task list */}
          {isLoading && (
            <p className="font-body text-sm text-text-muted">
              Loading tasks…
            </p>
          )}

          {!isLoading && totalCount === 0 && (
            <div className="bg-bg-raised rounded-lg border border-border-default px-4 py-6 text-center">
              <p className="font-body text-sm text-text-muted">
                No recurring tasks yet. Add instructions to your manual or
                overlay items to this trip.
              </p>
            </div>
          )}

          {!isLoading &&
            totalCount > 0 &&
            TIME_SLOT_ORDER.map((slot) => {
              const slotTasks = grouped[slot];
              if (!slotTasks) return null;
              return (
                <div key={slot} className="flex flex-col gap-2">
                  <h3 className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
                    {TIME_SLOT_LABELS[slot]}
                  </h3>
                  {slotTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onToggle={handleToggle} />
                  ))}
                </div>
              );
            })}

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

export default function ProofStepInner({ tripId }: { tripId: string }) {
  if (!CONVEX_URL) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-sm text-text-muted">
          Configuration error: Convex URL not set.
        </p>
      </div>
    );
  }
  return <ProofStep tripId={tripId as Id<"trips">} />;
}
