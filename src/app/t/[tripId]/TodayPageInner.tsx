"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SitterLayout } from "@/components/layouts/SitterLayout";
import type { TabId } from "@/components/ui/BottomNav";
import { TodayViewHeader } from "@/components/ui/TodayViewHeader";
import { EmergencyContactBar } from "@/components/ui/EmergencyContactBar";
import type { ContactRole } from "@/components/ui/EmergencyContactBar";
import { TimeSlotDivider } from "@/components/ui/TimeSlotDivider";
import type { TimeSlot } from "@/components/ui/TimeSlotDivider";
import { TaskItem } from "@/components/ui/TaskItem";
import { VaultTab } from "./VaultTab";
import { formatPhone } from "@/lib/phone";

// ── Types ─────────────────────────────────────────────────────────────

type SlotKey = "morning" | "afternoon" | "evening" | "anytime";

interface TodayTask {
  id: string;
  text: string;
  timeSlot: SlotKey;
  isOverlay: boolean;
  proofRequired: boolean;
  taskRef: string;
  taskType: "recurring" | "overlay";
}

// ── Helpers ───────────────────────────────────────────────────────────

const SLOT_ORDER: SlotKey[] = ["morning", "afternoon", "evening", "anytime"];

function toContactRole(role: string): ContactRole {
  const r = role.toLowerCase();
  if (r === "owner" || r.includes("owner") || r.includes("partner")) return "owner";
  if (r === "vet" || r.includes("vet")) return "vet";
  if (r === "neighbor" || r.includes("neighbor")) return "neighbor";
  return "emergency";
}

function buildTaskList(
  recurringInstructions: Array<{ _id: string; text: string; timeSlot: string; proofRequired: boolean }>,
  overlayItems: Array<{ _id: string; text: string; timeSlot: string; proofRequired: boolean }>,
  today: string,
): TodayTask[] {
  const recurring: TodayTask[] = recurringInstructions.map((inst) => ({
    id: inst._id,
    text: inst.text,
    timeSlot: inst.timeSlot as SlotKey,
    isOverlay: false,
    proofRequired: inst.proofRequired,
    // Date-scoped ref so recurring tasks reset daily
    taskRef: `recurring:${inst._id}:${today}`,
    taskType: "recurring" as const,
  }));

  const overlay: TodayTask[] = overlayItems.map((item) => ({
    id: item._id,
    text: item.text,
    timeSlot: item.timeSlot as SlotKey,
    isOverlay: true,
    proofRequired: item.proofRequired,
    taskRef: `overlay:${item._id}`,
    taskType: "overlay" as const,
  }));

  return [...recurring, ...overlay];
}

function groupBySlot(tasks: TodayTask[]): Record<SlotKey, TodayTask[]> {
  const groups: Record<SlotKey, TodayTask[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    anytime: [],
  };
  for (const task of tasks) {
    groups[task.timeSlot].push(task);
  }
  return groups;
}

function getTripDay(startDate: string, today: string): number {
  const start = Date.UTC(
    ...startDate.split("-").map(Number) as [number, number, number],
  );
  const curr = Date.UTC(
    ...today.split("-").map(Number) as [number, number, number],
  );
  return Math.max(1, Math.floor((curr - start) / 86_400_000) + 1);
}

function getTripLength(startDate: string, endDate: string): number {
  const start = Date.UTC(
    ...startDate.split("-").map(Number) as [number, number, number],
  );
  const end = Date.UTC(
    ...endDate.split("-").map(Number) as [number, number, number],
  );
  return Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
}

// ── Anytime divider (not in TimeSlotDivider component) ────────────────

function AnytimeDivider() {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label="Anytime tasks">
      <span
        className="flex items-center justify-center w-8 h-8 rounded-round bg-bg-sunken text-base leading-none shrink-0"
        aria-hidden="true"
      >
        ✦
      </span>
      <span className="font-body text-sm font-bold tracking-[0.05em] leading-none text-text-primary shrink-0">
        ANYTIME
      </span>
      <span className="flex-1 h-px bg-border-default min-w-5" aria-hidden="true" />
    </div>
  );
}

// ── Slot section ──────────────────────────────────────────────────────

interface SlotSectionProps {
  slot: SlotKey;
  tasks: TodayTask[];
  completionMap: Map<string, Id<"taskCompletions">>;
  onToggle: (task: TodayTask, currentlyCompleted: boolean, completionId?: Id<"taskCompletions">) => void;
}

function SlotSection({ slot, tasks, completionMap, onToggle }: SlotSectionProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {slot === "anytime" ? (
        <AnytimeDivider />
      ) : (
        <TimeSlotDivider slot={slot as TimeSlot} />
      )}
      <div className="flex flex-col gap-2">
        {tasks.map((task) => {
          const completionId = completionMap.get(task.taskRef);
          const isCompleted = completionId !== undefined;
          return (
            <TaskItem
              key={task.taskRef}
              text={task.text}
              completed={isCompleted}
              overlay={task.isOverlay}
              showProof={task.proofRequired && !isCompleted}
              onToggle={() => onToggle(task, isCompleted, completionId)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Tomorrow preview ──────────────────────────────────────────────────

interface TomorrowPreviewProps {
  recurringInstructions: TodayTask[];
  overlayItems: TodayTask[];
}

function TomorrowPreview({ recurringInstructions, overlayItems }: TomorrowPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const allTasks = [...recurringInstructions, ...overlayItems];
  const groups = groupBySlot(allTasks);
  const totalCount = allTasks.length;

  return (
    <div className="rounded-lg bg-bg-sunken border border-border-default overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <span className="font-body text-sm font-semibold text-text-secondary">
            Tomorrow
          </span>
          {totalCount > 0 && (
            <span className="font-body text-xs text-text-muted bg-bg-raised border border-border-default rounded-pill px-2 py-0.5">
              {totalCount} task{totalCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-text-muted transition-[rotate] duration-250 ease-out ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border-default pt-3">
          {totalCount === 0 ? (
            <p className="font-body text-sm text-text-muted">No tasks scheduled for tomorrow.</p>
          ) : (
            SLOT_ORDER.map((slot) => {
              const slotTasks = groups[slot];
              if (slotTasks.length === 0) return null;
              return (
                <div key={slot} className="flex flex-col gap-2">
                  {slot === "anytime" ? (
                    <AnytimeDivider />
                  ) : (
                    <TimeSlotDivider slot={slot as TimeSlot} />
                  )}
                  <div className="flex flex-col gap-1.5">
                    {slotTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 py-2.5 px-3 rounded-md bg-bg-raised border border-border-default"
                      >
                        <div className="w-[18px] h-[18px] min-w-[18px] rounded-sm border border-border-strong bg-bg-raised mt-px" />
                        <span className="font-body text-sm text-text-secondary leading-snug">
                          {task.text}
                        </span>
                        {task.isOverlay && (
                          <span className="ml-auto shrink-0 font-body text-xs font-semibold text-accent bg-accent-light rounded-pill px-2 py-0.5">
                            ✦ Trip
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────

function EmptyTaskState() {
  return (
    <div className="bg-bg-raised rounded-xl border border-dashed border-border-strong p-8 flex flex-col items-center text-center gap-3">
      <span className="text-3xl" aria-hidden="true">
        ☀️
      </span>
      <p className="font-body text-sm font-semibold text-text-primary">No tasks today</p>
      <p className="font-body text-xs text-text-muted max-w-[240px]">
        You&rsquo;re all caught up! Check the Full Manual for property details.
      </p>
    </div>
  );
}

// ── Not found state ───────────────────────────────────────────────────

function TripNotFound() {
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

// ── Loading skeleton ──────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-dvh bg-bg animate-pulse">
      <div className="h-48 bg-primary-light rounded-b-2xl" />
      <div className="p-4 flex flex-col gap-4">
        <div className="h-16 bg-bg-raised rounded-lg" />
        <div className="h-10 bg-bg-raised rounded-lg" />
        <div className="h-10 bg-bg-raised rounded-lg" />
      </div>
    </div>
  );
}

// ── Contacts tab ──────────────────────────────────────────────────────

const roleCardBg: Record<ContactRole, string> = {
  owner: "bg-primary-light",
  vet: "bg-secondary-light",
  neighbor: "bg-accent-light",
  emergency: "bg-danger-light",
};

const roleCardText: Record<ContactRole, string> = {
  owner: "text-primary",
  vet: "text-secondary",
  neighbor: "text-accent",
  emergency: "text-danger",
};

/** Fuzzy role → color mapping for display purposes */
function getRoleForColor(role: string): ContactRole {
  const r = role.toLowerCase();
  if (r.includes("owner") || r.includes("partner")) return "owner";
  if (r.includes("vet")) return "vet";
  if (r.includes("neighbor")) return "neighbor";
  return "emergency";
}

interface ContactTabEntry {
  name: string;
  role: string;
  phone: string;
  notes?: string;
  isLocked: boolean;
}

function ContactsTab({ contacts }: { contacts: ContactTabEntry[] }) {
  const visible = contacts.filter((c) => c.name && c.phone);

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <span className="text-3xl" aria-hidden="true">📞</span>
        <p className="font-body text-sm font-semibold text-text-primary">No contacts yet</p>
        <p className="font-body text-xs text-text-muted max-w-[220px]">
          The owner hasn&rsquo;t added any emergency contacts.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-xl text-text-primary">Emergency Contacts</h2>
      <div className="flex flex-col gap-3">
        {visible.map((contact, i) => {
          const colorRole = getRoleForColor(contact.role);
          return (
            <div
              key={`${contact.name}-${i}`}
              className="bg-bg-raised rounded-lg border border-border-default shadow-xs p-4 flex flex-col gap-3"
            >
              {/* Header: avatar + name + role badge */}
              <div className="flex items-center gap-3">
                <span
                  className={`flex items-center justify-center w-10 h-10 rounded-round shrink-0 font-body text-sm font-bold ${roleCardBg[colorRole]} ${roleCardText[colorRole]}`}
                  aria-hidden="true"
                >
                  {contact.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-text-primary leading-tight">
                    {contact.name}
                  </p>
                  <span
                    className={`inline-block font-body text-xs font-medium rounded-pill px-2 py-0.5 mt-0.5 ${roleCardBg[colorRole]} ${roleCardText[colorRole]}`}
                  >
                    {contact.role}
                  </span>
                </div>
              </div>

              {/* Phone — tappable tel: link */}
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-3 font-body text-sm font-medium text-secondary no-underline"
                aria-label={`Call ${contact.name} at ${contact.phone}`}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="-1 -1 26 26"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.61 19.79 19.79 0 01.07 1a2 2 0 012-2H6a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                {formatPhone(contact.phone)}
              </a>

              {/* Notes (optional) */}
              {contact.notes && (
                <p className="font-body text-xs text-text-muted leading-relaxed border-t border-border-default pt-3">
                  {contact.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function TodayPageInner({ tripId }: { tripId: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("today");

  // Compute today's date as YYYY-MM-DD in local timezone
  const today = new Date().toLocaleDateString("en-CA");

  const data = useQuery(api.todayView.getTodayTasks, {
    tripId: tripId as Id<"trips">,
    today,
  });

  const createCompletion = useMutation(api.taskCompletions.create);
  const removeCompletion = useMutation(api.taskCompletions.remove);

  const handleToggle = useCallback(
    async (
      task: TodayTask,
      currentlyCompleted: boolean,
      completionId?: Id<"taskCompletions">,
    ) => {
      if (currentlyCompleted && completionId) {
        await removeCompletion({ taskCompletionId: completionId });
      } else if (!currentlyCompleted) {
        const sitterName = data?.sitters?.[0]?.name ?? "Sitter";
        await createCompletion({
          tripId: tripId as Id<"trips">,
          taskRef: task.taskRef,
          taskType: task.taskType,
          sitterName,
          completedAt: Date.now(),
          date: today,
        });
      }
    },
    [data, today, tripId, createCompletion, removeCompletion],
  );

  if (data === undefined) return <LoadingSkeleton />;
  if (data === null) return <TripNotFound />;

  const { trip, property, sitters, emergencyContacts, recurringInstructions, todayOverlayItems, completions } =
    data as {
      trip: { startDate: string; endDate: string };
      property: { _id: Id<"properties">; name: string } | null;
      sitters: Array<{ name: string }>;
      emergencyContacts: Array<{ name: string; role: string; phone: string; notes?: string; isLocked: boolean }>;
      recurringInstructions: Array<{ _id: string; text: string; timeSlot: string; proofRequired: boolean }>;
      todayOverlayItems: Array<{ _id: string; text: string; timeSlot: string; proofRequired: boolean }>;
      tomorrowRecurringInstructions: Array<{ _id: string; text: string; timeSlot: string; proofRequired: boolean }>;
      tomorrowOverlayItems: Array<{ _id: string; text: string; timeSlot: string; proofRequired: boolean }>;
      completions: Array<{ _id: Id<"taskCompletions">; taskRef: string }>;
    };

  const sitterName = sitters[0]?.name ?? "there";
  const currentDay = getTripDay(trip.startDate, today);
  const totalDays = getTripLength(trip.startDate, trip.endDate);

  // Build today's task list and group by slot
  const todayTasks = buildTaskList(recurringInstructions, todayOverlayItems, today);
  const taskGroups = groupBySlot(todayTasks);

  // Build tomorrow's task list for preview — only if tomorrow is still within the trip window
  const tomorrowDate = (data as { tomorrow: string }).tomorrow;
  const showTomorrow = tomorrowDate <= trip.endDate;
  const tomorrowTasks = showTomorrow
    ? buildTaskList(
        (data as { tomorrowRecurringInstructions: typeof recurringInstructions }).tomorrowRecurringInstructions,
        (data as { tomorrowOverlayItems: typeof todayOverlayItems }).tomorrowOverlayItems,
        tomorrowDate,
      )
    : [];
  const tomorrowGroups = groupBySlot(tomorrowTasks);

  // Build a map of taskRef → completion ID for O(1) lookup
  const completionMap = new Map<string, Id<"taskCompletions">>(
    completions.map((c) => [c.taskRef, c._id as Id<"taskCompletions">]),
  );

  // Compute stats
  const tasksToday = todayTasks.length;
  const completedTasks = todayTasks.filter((t) => completionMap.has(t.taskRef)).length;
  const proofNeeded = todayTasks.filter(
    (t) => t.proofRequired && !completionMap.has(t.taskRef),
  ).length;

  // Emergency contacts (skip locked ones for now — vault auth is a separate story)
  const visibleContacts = emergencyContacts
    .filter((c) => !c.isLocked)
    .map((c) => ({
      name: c.name,
      role: toContactRole(c.role),
      phone: c.phone,
    }));

  const hasTodayTasks = tasksToday > 0;

  return (
    <SitterLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {/* ── Vault tab ─────────────────────────────────────────────── */}
      {activeTab === "vault" && property && (
        <VaultTab
          tripId={tripId as Id<"trips">}
          propertyId={property._id}
          ownerName={property.name}
        />
      )}

      {/* ── Today tab ─────────────────────────────────────────────── */}
      {activeTab === "today" && (
        <>
          {/* Negative margin so header bleeds to edges inside the padded layout */}
          <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-6 lg:-mt-8">
            <TodayViewHeader
              sitterName={sitterName}
              currentDay={currentDay}
              totalDays={totalDays}
              tasksToday={tasksToday}
              completedTasks={completedTasks}
              proofNeeded={proofNeeded}
            />
          </div>

          {/* Emergency contact bar */}
          {visibleContacts.length > 0 && (
            <div className="mt-4">
              <EmergencyContactBar contacts={visibleContacts} />
            </div>
          )}

          {/* Task list */}
          <div className="mt-6 flex flex-col gap-6">
            {!hasTodayTasks ? (
              <EmptyTaskState />
            ) : (
              SLOT_ORDER.map((slot) => (
                <SlotSection
                  key={slot}
                  slot={slot}
                  tasks={taskGroups[slot]}
                  completionMap={completionMap}
                  onToggle={handleToggle}
                />
              ))
            )}
          </div>

          {/* Tomorrow preview — hidden on the last day of the trip */}
          {showTomorrow && (
            <div className="mt-8">
              <TomorrowPreview
                recurringInstructions={SLOT_ORDER.flatMap((slot) =>
                  tomorrowGroups[slot].filter((t) => !t.isOverlay),
                )}
                overlayItems={SLOT_ORDER.flatMap((slot) =>
                  tomorrowGroups[slot].filter((t) => t.isOverlay),
                )}
              />
            </div>
          )}

          {/* Bottom spacer */}
          <div className="h-4" />
        </>
      )}

      {/* ── Contacts tab ───────────────────────────────────────────── */}
      {activeTab === "contacts" && (
        <ContactsTab contacts={emergencyContacts} />
      )}

      {/* ── Manual tab ─────────────────────────────────────────────── */}
      {activeTab === "manual" && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-3xl" aria-hidden="true">🚧</span>
          <p className="font-body text-sm font-semibold text-text-primary">Coming soon</p>
          <p className="font-body text-xs text-text-muted max-w-[220px]">
            This section is being built. Check back soon.
          </p>
        </div>
      )}
    </SitterLayout>
  );
}
