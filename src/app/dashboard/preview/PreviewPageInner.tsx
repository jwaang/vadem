"use client";

import { useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { TabId } from "@/components/ui/BottomNav";
import { TodayViewHeader } from "@/components/ui/TodayViewHeader";
import { EmergencyContactBar } from "@/components/ui/EmergencyContactBar";
import type { ContactRole } from "@/components/ui/EmergencyContactBar";
import { TimeSlotDivider } from "@/components/ui/TimeSlotDivider";
import type { TimeSlot } from "@/components/ui/TimeSlotDivider";
import { TaskItem } from "@/components/ui/TaskItem";
import { LocationCard } from "@/components/ui/LocationCard";
import { ManualTab } from "@/app/t/[tripId]/ManualTab";
import {
  type SlotKey,
  type TodayTask,
  type LocationCardData,
  SLOT_ORDER,
  formatTimeRange,
  buildTaskList,
  groupBySlot,
  AnytimeDivider,
} from "@/lib/todayViewHelpers";
import { BottomNav } from "@/components/ui/BottomNav";
import { ContactsTab } from "@/components/ui/ContactsTab";
import { PreTripHeader } from "@/components/ui/PreTripHeader";
import { PreTripInfoBanner } from "@/components/ui/PreTripInfoBanner";
import { PreviewBanner } from "./PreviewBanner";
import { PreviewVaultTab } from "./PreviewVaultTab";

// ── Helpers ───────────────────────────────────────────────────────────

function toContactRole(role: string): ContactRole {
  const r = role.toLowerCase();
  if (r === "owner" || r.includes("owner") || r.includes("partner")) return "owner";
  if (r === "vet" || r.includes("vet")) return "vet";
  if (r === "neighbor" || r.includes("neighbor")) return "neighbor";
  return "emergency";
}

// ── Slot section (read-only) ─────────────────────────────────────────

function PreviewSlotSection({ slot, tasks }: { slot: SlotKey; tasks: TodayTask[] }) {
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
          const lc = task.locationCard;
          return (
            <div key={task.taskRef}>
              <TaskItem
                text={task.text}
                completed={false}
                overlay={task.isOverlay}
                time={task.specificTime ? formatTimeRange(task.specificTime, task.specificTimeEnd) : undefined}
                showProof={false}
                onToggle={() => {}}
              />
              {lc && (
                <div className="mt-1.5">
                  <LocationCard
                    src={lc.photoUrl}
                    videoSrc={lc.videoUrl}
                    caption={lc.caption ?? ""}
                    room={lc.roomTag}
                    compact
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────

function EmptyTaskState() {
  return (
    <div className="bg-bg-raised rounded-xl border border-dashed border-border-strong p-8 flex flex-col items-center text-center gap-3">
      <span className="text-3xl" aria-hidden="true">
        ☀️
      </span>
      <p className="font-body text-sm font-semibold text-text-primary">No tasks yet</p>
      <p className="font-body text-xs text-text-muted max-w-[240px]">
        Add sections with instructions to your property to see tasks here.
      </p>
    </div>
  );
}

// ── Main preview component ───────────────────────────────────────────

interface PreviewPageInnerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  mode?: "creator-preview" | "pre-trip";
  tripMeta?: {
    propertyName: string;
    startDate: string;
    endDate: string;
    petCount: number;
  };
}

export function PreviewPageInner({ data, mode = "creator-preview", tripMeta }: PreviewPageInnerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("today");

  const { property, emergencyContacts, recurringInstructions } = data as {
    property: { _id: Id<"properties">; name: string } | null;
    emergencyContacts: Array<{
      name: string;
      role: string;
      phone: string;
      notes?: string;
      isLocked: boolean;
    }>;
    recurringInstructions: Array<{
      _id: string;
      text: string;
      timeSlot: string;
      specificTime?: string;
      proofRequired: boolean;
      locationCard?: LocationCardData;
    }>;
  };

  const today = new Date().toLocaleDateString("en-CA");

  // Build task list (no overlay items in preview)
  const todayTasks = buildTaskList(recurringInstructions, [], today);
  const taskGroups = groupBySlot(todayTasks);
  const hasTodayTasks = todayTasks.length > 0;

  // Emergency contacts
  const visibleContacts = emergencyContacts
    .filter((c) => !c.isLocked)
    .map((c) => ({
      name: c.name,
      role: toContactRole(c.role),
      phone: c.phone,
    }));

  // Show all 4 sitter tabs in preview
  const previewTabs: TabId[] = ["today", "manual", "vault", "contacts"];

  return (
    <div className="flex flex-col min-h-dvh">
      {mode === "pre-trip" && tripMeta ? (
        <PreTripInfoBanner startDate={tripMeta.startDate} />
      ) : (
        <PreviewBanner />
      )}

      <main className="flex-1 pb-[calc(72px+env(safe-area-inset-bottom))]">
        <div className="max-w-[600px] mx-auto p-4 md:max-w-[640px] md:p-6 lg:p-8 lg:px-6">
          {/* ── Today tab ─────────────────────────────────────── */}
          {activeTab === "today" && (
            <>
              <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-6 lg:-mt-8">
                {mode === "pre-trip" && tripMeta ? (
                  <PreTripHeader
                    propertyName={tripMeta.propertyName}
                    startDate={tripMeta.startDate}
                    endDate={tripMeta.endDate}
                    petCount={tripMeta.petCount}
                  />
                ) : (
                  <TodayViewHeader
                    sitterName="Sitter"
                    currentDay={1}
                    totalDays={7}
                    tasksToday={todayTasks.length}
                    completedTasks={0}
                    proofNeeded={0}
                  />
                )}
              </div>

              {visibleContacts.length > 0 && (
                <div className="mt-4">
                  <EmergencyContactBar contacts={visibleContacts} />
                </div>
              )}

              <div className="mt-6 flex flex-col gap-6">
                {!hasTodayTasks ? (
                  <EmptyTaskState />
                ) : (
                  SLOT_ORDER.map((slot) => (
                    <PreviewSlotSection
                      key={slot}
                      slot={slot}
                      tasks={taskGroups[slot]}
                    />
                  ))
                )}
              </div>

              <div className="h-4" />
            </>
          )}

          {/* ── Manual tab ────────────────────────────────────── */}
          {activeTab === "manual" && property && (
            <ManualTab propertyId={property._id} isOnline />
          )}

          {/* ── Vault tab (read-only, locked items) ────────── */}
          {activeTab === "vault" && property && (
            <PreviewVaultTab propertyId={property._id} />
          )}

          {/* ── Contacts tab ────────────────────────────────── */}
          {activeTab === "contacts" && (
            <ContactsTab contacts={emergencyContacts} />
          )}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} visibleTabs={previewTabs} variant="sticky" />
    </div>
  );
}
