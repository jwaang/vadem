"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
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
import { LocationCard } from "@/components/ui/LocationCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { VaultTab } from "./VaultTab";
import { ManualTab } from "./ManualTab";
import { formatPhone } from "@/lib/phone";
import {
  saveTripData,
  loadTripData,
  notifySwManualVersion,
  swCacheTripData,
} from "@/lib/offlineTripData";
import {
  getQueue,
  enqueue,
  dequeue,
  removeByTaskRefs,
  incrementRetry,
} from "@/lib/offlineQueue";
import {
  enqueuePhoto,
  getPhotoQueue,
  getPhotoCounts,
  removePhotoEntry,
  recordPhotoRetry,
  markPhotoFailed,
  MAX_PHOTO_RETRIES,
  type PendingPhotoUpload,
} from "@/lib/photoUploadQueue";

// ── Types ─────────────────────────────────────────────────────────────

type SlotKey = "morning" | "afternoon" | "evening" | "anytime";

interface LocationCardData {
  photoUrl?: string;
  videoUrl?: string;
  caption?: string;
  roomTag?: string;
}

interface TodayTask {
  id: string;
  text: string;
  timeSlot: SlotKey;
  isOverlay: boolean;
  proofRequired: boolean;
  taskRef: string;
  taskType: "recurring" | "overlay";
  locationCard?: LocationCardData;
}

interface CompletionInfo {
  /** Undefined for offline-queued completions that haven't synced yet. */
  id?: Id<"taskCompletions">;
  proofPhotoUrl?: string;
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
  recurringInstructions: Array<{ _id: string; text: string; timeSlot: string; proofRequired: boolean; locationCard?: LocationCardData }>,
  overlayItems: Array<{ _id: string; text: string; timeSlot: string; proofRequired: boolean; locationCard?: LocationCardData }>,
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
    locationCard: inst.locationCard,
  }));

  const overlay: TodayTask[] = overlayItems.map((item) => ({
    id: item._id,
    text: item.text,
    timeSlot: item.timeSlot as SlotKey,
    isOverlay: true,
    proofRequired: item.proofRequired,
    taskRef: `overlay:${item._id}`,
    taskType: "overlay" as const,
    locationCard: item.locationCard,
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

function getSitterName(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("vadem_sitter_name") ?? "";
}

function setSitterName(name: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("vadem_sitter_name", name);
  }
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

// ── Uncheck confirmation sheet ────────────────────────────────────────

interface UncheckConfirmSheetProps {
  hasProof: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function UncheckConfirmSheet({ hasProof, onConfirm, onCancel }: UncheckConfirmSheetProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(42,31,26,0.4)]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg bg-bg-raised rounded-t-2xl shadow-xl p-6 pb-8 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-text-primary">Unmark as complete?</h2>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center text-text-muted rounded-round hover:bg-bg-sunken transition-colors duration-150"
            onClick={onCancel}
            aria-label="Cancel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p className="font-body text-sm text-text-secondary">
          {hasProof
            ? "This will remove the completion and permanently delete the proof photo. This cannot be undone."
            : "This will mark the task as incomplete."}
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="danger" className="w-full" onClick={onConfirm}>
            {hasProof ? "Unmark and delete photo" : "Unmark as complete"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onCancel}>
            Keep it done
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Name prompt modal ─────────────────────────────────────────────────

interface NamePromptProps {
  initialName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

function NamePrompt({ initialName, onConfirm, onCancel }: NamePromptProps) {
  const [name, setName] = useState(initialName);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(42,31,26,0.4)]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg bg-bg-raised rounded-t-2xl shadow-xl p-6 pb-8 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-text-primary">Your name</h2>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center text-text-muted rounded-round hover:bg-bg-sunken transition-colors duration-150"
            onClick={onCancel}
            aria-label="Cancel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p className="font-body text-sm text-text-secondary">
          We&rsquo;ll attach your name to the proof photo so the owner knows who completed this task.
        </p>
        <Input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm(name.trim());
          }}
        />
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => onConfirm(name.trim())}
          disabled={name.trim().length === 0}
        >
          Continue to photo
        </button>
      </div>
    </div>
  );
}

// ── Slot section ──────────────────────────────────────────────────────

interface SlotSectionProps {
  slot: SlotKey;
  tasks: TodayTask[];
  completionMap: Map<string, CompletionInfo>;
  uploadingTaskRef: string | null;
  onToggle: (task: TodayTask, currentlyCompleted: boolean, completionId?: Id<"taskCompletions">) => void;
  onProof: (task: TodayTask) => void;
  onPhotoClick: (url: string) => void;
}

function SlotSection({ slot, tasks, completionMap, uploadingTaskRef, onToggle, onProof, onPhotoClick }: SlotSectionProps) {
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
          const completion = completionMap.get(task.taskRef);
          const isCompleted = completion !== undefined;
          const isUploading = uploadingTaskRef === task.taskRef;
          const lc = task.locationCard;
          return (
            <div key={task.taskRef}>
              <TaskItem
                text={task.text}
                completed={isCompleted || isUploading}
                overlay={task.isOverlay}
                showProof={task.proofRequired && !isCompleted && !isUploading}
                proofPhotoUrl={completion?.proofPhotoUrl}
                onPhotoClick={completion?.proofPhotoUrl ? () => onPhotoClick(completion.proofPhotoUrl!) : undefined}
                uploading={isUploading}
                onToggle={() => onToggle(task, isCompleted, completion?.id)}
                onProof={() => onProof(task)}
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

// ── Offline sync banner ───────────────────────────────────────────────

/**
 * Subtle fixed bar shown at the bottom of the viewport when the device is
 * offline. Positioned above the bottom nav (z-30 < z-40 for nav).
 */
function OfflineBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-0 right-0 z-30 flex items-center justify-center gap-2 bg-warning-light text-warning font-body text-xs rounded-t-lg px-4 py-2"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
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
      offline — will sync when connected
    </div>
  );
}

// ── Sitter conversion banner ───────────────────────────────────────────

const CONVERSION_BANNER_KEY = "vadem_conversion_banner_dismissed";

/**
 * Slim, non-intrusive banner shown during active trips encouraging the sitter
 * to create their own Vadem. Dismissible for the session.
 * Positioned above the bottom nav; hidden when offline banner is visible.
 */
function SitterConversionBanner({ tripId }: { tripId: string }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(CONVERSION_BANNER_KEY) === "1";
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(CONVERSION_BANNER_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (dismissed) return null;

  return (
    <div
      role="complementary"
      aria-label="Create your own Vadem"
      className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-0 right-0 z-30 flex items-center justify-between gap-3 bg-primary-subtle text-primary font-body text-xs rounded-t-lg px-4 py-2"
    >
      <span className="shrink-0">Want your own Vadem?</span>
      <Link
        href={`/signup?ref=${tripId}`}
        className="font-semibold underline underline-offset-2 hover:text-primary-hover shrink-0"
      >
        Create one →
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="ml-auto shrink-0 flex items-center justify-center w-5 h-5 rounded-round hover:bg-primary/10 transition-[background-color] duration-150"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function TodayPageInner({ tripId, shareLink }: { tripId: string; shareLink: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab: TabId = (() => {
    const tab = searchParams.get("tab");
    if (tab === "manual" || tab === "vault" || tab === "contacts") return tab;
    return "today";
  })();
  const setActiveTab = useCallback((tab: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "today") params.delete("tab");
    else params.set("tab", tab);
    if (tab !== "manual") params.delete("q");
    const qs = params.toString();
    router.replace(`/t/${shareLink}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, router, shareLink]);

  // Compute today's date as YYYY-MM-DD in local timezone
  const today = new Date().toLocaleDateString("en-CA");

  // Record first open — fire once per browser session, deduplicated server-side too.
  const recordFirstOpen = useAction(api.sitterActions.recordFirstOpen);
  const hasRecordedOpenRef = useRef(false);
  useEffect(() => {
    if (hasRecordedOpenRef.current) return;
    const key = `hoff_opened_${tripId}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // sessionStorage unavailable (private browsing restrictions) — proceed anyway
    }
    hasRecordedOpenRef.current = true;
    void recordFirstOpen({ tripId: tripId as Id<"trips"> }).then(() => {
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        // ignore sessionStorage write failures
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  // Proof upload state
  const [pendingProofTask, setPendingProofTask] = useState<TodayTask | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [uploadingTaskRef, setUploadingTaskRef] = useState<string | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [pendingUncheck, setPendingUncheck] = useState<{
    completionId: Id<"taskCompletions">;
    hasProof: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingProofNameRef = useRef<string>("");

  // Pending photo upload queue state (IndexedDB-backed)
  const [pendingUploadCount, setPendingUploadCount] = useState(0);
  const [failedUploadCount, setFailedUploadCount] = useState(0);
  const photoDrainInProgressRef = useRef(false);

  // ── Online / offline state ─────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ── Offline task queue ─────────────────────────────────────────────────
  // taskRefs checked while offline (or whose mutation failed). These render
  // as checked even before the Convex server confirms them.
  const [pendingTaskRefs, setPendingTaskRefs] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set<string>();
    return new Set(getQueue(tripId).map((e) => e.taskRef));
  });

  const liveData = useQuery(api.todayView.getTodayTasks, {
    tripId: tripId as Id<"trips">,
    today,
  });

  // ── Offline persistence ────────────────────────────────────────────────
  // Load the last-known trip data from localStorage so the sitter can see
  // their instructions offline (when Convex cannot reconnect).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cachedData, setCachedData] = useState<any>(null);

  // On mount, read whatever was previously persisted
  useEffect(() => {
    const saved = loadTripData(tripId);
    if (saved) setCachedData(saved);
  }, [tripId]);

  // Load photo upload queue counts and taskRefs from IndexedDB on mount.
  // IndexedDB is async so we can't initialize in useState; add refs to
  // pendingTaskRefs so offline-queued proof tasks render as checked.
  useEffect(() => {
    void getPhotoCounts(tripId).then(({ pending, failed }) => {
      setPendingUploadCount(pending);
      setFailedUploadCount(failed);
    });
    void getPhotoQueue(tripId).then((entries) => {
      if (entries.length > 0) {
        setPendingTaskRefs((prev) => new Set([...prev, ...entries.map((e) => e.taskRef)]));
      }
    });
  }, [tripId]);

  // When fresh data arrives from Convex, persist it, notify the SW, and
  // clean up any queue entries that are now confirmed server-side.
  useEffect(() => {
    if (!liveData) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const live = liveData as any;
    const propertyId: string | undefined = live?.property?._id;
    const manualVersion: number = live?.property?.manualVersion ?? 0;

    // Persist to localStorage (offline fallback)
    saveTripData(tripId, propertyId ?? "", manualVersion, liveData);

    // Also persist to SW Cache Storage for extra durability
    swCacheTripData(`trip_${tripId}`, liveData);

    // Tell the SW to check/invalidate photo+content caches if version changed
    if (propertyId) {
      notifySwManualVersion(propertyId, manualVersion);
    }

    // Update in-memory cached copy
    setCachedData(liveData);

    // Remove queue entries that Convex now confirms as complete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const syncedRefs = new Set<string>((live?.completions ?? []).map((c: any) => c.taskRef as string));
    const removed = removeByTaskRefs(tripId, syncedRefs);
    if (removed) {
      setPendingTaskRefs((prev) => {
        const next = new Set(prev);
        for (const ref of syncedRefs) {
          next.delete(ref);
        }
        return next;
      });
    }

    // Clean up IndexedDB photo entries that are now confirmed server-side.
    // This handles the case where another device uploaded the proof, or the
    // mutation succeeded but the component didn't clean up (e.g. app restart).
    void getPhotoQueue(tripId).then((photoQueue) => {
      const toRemove = photoQueue.filter((e) => syncedRefs.has(e.taskRef));
      for (const entry of toRemove) {
        void removePhotoEntry(entry.id).then(() => {
          setPendingUploadCount((prev) => Math.max(0, prev - 1));
        });
      }
    });
  }, [liveData, tripId]);

  // Resolve: prefer live data, fall back to cached when Convex is unavailable
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = liveData ?? cachedData;

  // ── Queue drain on reconnect ───────────────────────────────────────────
  // Keep a ref so we only start one drain per online transition even if the
  // effect fires multiple times during the same online session.
  const drainInProgressRef = useRef(false);

  // completeTask: immediately updates the Convex local store so the checkbox responds
  // before the server round-trip completes (offline resilience via optimistic update).
  const completeTask = useMutation(api.taskCompletions.completeTask).withOptimisticUpdate(
    (localStore, args) => {
      const currentData = localStore.getQuery(api.todayView.getTodayTasks, {
        tripId: args.tripId,
        today,
      });
      if (!currentData) return;
      // Use taskRef as stable optimistic ID (no Date.now() — that's impure in render-time closures)
      const optimisticCompletion = {
        _id: `opt:${args.taskRef}` as Id<"taskCompletions">,
        _creationTime: 0,
        tripId: args.tripId,
        taskRef: args.taskRef,
        taskType: args.taskType,
        sitterName: args.sitterName,
        completedAt: 0,
        date: today,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = ((currentData as any).completions ?? []) as typeof optimisticCompletion[];
      localStore.setQuery(
        api.todayView.getTodayTasks,
        { tripId: args.tripId, today },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { ...(currentData as any), completions: [...existing, optimisticCompletion] },
      );
    },
  );

  const removeCompletion = useMutation(api.taskCompletions.remove).withOptimisticUpdate(
    (localStore, args) => {
      const currentData = localStore.getQuery(api.todayView.getTodayTasks, {
        tripId: tripId as Id<"trips">,
        today,
      });
      if (!currentData) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = ((currentData as any).completions ?? []) as Array<{
        _id: Id<"taskCompletions">;
      }>;
      localStore.setQuery(
        api.todayView.getTodayTasks,
        { tripId: tripId as Id<"trips">, today },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(currentData as any),
          completions: existing.filter((c) => c._id !== args.taskCompletionId),
        },
      );
    },
  );

  const completeTaskWithProof = useMutation(api.taskCompletions.completeTaskWithProof);
  const generateUploadUrl = useAction(api.storage.generateUploadUrl);

  // Drain the photo upload queue when the device comes back online.
  // Each entry is uploaded to Convex storage with the original completedAt timestamp
  // and exponential backoff (2^retryCount seconds, up to MAX_PHOTO_RETRIES attempts).
  // generateUploadUrl and completeTaskWithProof are stable Convex hook refs.
  useEffect(() => {
    if (!isOnline) {
      photoDrainInProgressRef.current = false;
      return;
    }
    if (photoDrainInProgressRef.current) return;
    photoDrainInProgressRef.current = true;

    async function processPhotoEntry(entry: PendingPhotoUpload): Promise<void> {
      try {
        const uploadUrl = await generateUploadUrl({});
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": entry.blob.type },
          body: entry.blob,
        });
        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
        const { storageId } = (await uploadRes.json()) as { storageId: string };
        await completeTaskWithProof({
          tripId: entry.tripId as Id<"trips">,
          taskRef: entry.taskRef,
          taskType: entry.taskType,
          sitterName: entry.sitterName,
          storageId: storageId as Id<"_storage">,
          completedAt: entry.completedAt,
        });
        await removePhotoEntry(entry.id);
        setPendingUploadCount((prev) => Math.max(0, prev - 1));
        // pendingTaskRefs cleanup is handled by the liveData effect (removeByTaskRefs)
      } catch {
        const newRetryCount = entry.retryCount + 1;
        if (newRetryCount >= MAX_PHOTO_RETRIES) {
          await markPhotoFailed(entry.id);
          setPendingUploadCount((prev) => Math.max(0, prev - 1));
          setFailedUploadCount((prev) => prev + 1);
        } else {
          await recordPhotoRetry(entry.id, newRetryCount);
          // Exponential backoff: 2s, 4s (up to MAX_PHOTO_RETRIES-1 attempts)
          const backoffMs = Math.pow(2, newRetryCount) * 1000;
          setTimeout(() => {
            void processPhotoEntry({ ...entry, retryCount: newRetryCount });
          }, backoffMs);
        }
      }
    }

    void (async () => {
      const queue = await getPhotoQueue(tripId);
      for (const entry of queue) {
        // Fire all uploads concurrently; each manages its own backoff on failure
        void processPhotoEntry(entry);
      }
    })();
  // generateUploadUrl and completeTaskWithProof are stable Convex hook refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, tripId]);

  // Drain the offline queue when the device comes back online.
  // Each queued entry is submitted with its original completedAt timestamp.
  // The server deduplicates on tripId+taskRef so re-submitting is safe.
  useEffect(() => {
    if (!isOnline) {
      drainInProgressRef.current = false;
      return;
    }
    if (drainInProgressRef.current) return;
    drainInProgressRef.current = true;

    void (async () => {
      const queue = getQueue(tripId);
      for (const entry of queue) {
        try {
          await completeTask({
            tripId: entry.tripId as Id<"trips">,
            taskRef: entry.taskRef,
            taskType: entry.taskType,
            sitterName: entry.sitterName,
            completedAt: entry.completedAt,
          });
          dequeue(tripId, entry.id);
          setPendingTaskRefs((prev) => {
            const next = new Set(prev);
            next.delete(entry.taskRef);
            return next;
          });
        } catch {
          incrementRetry(tripId, entry.id);
        }
      }
    })();
  // completeTask is stable (useMutation returns a stable ref); isOnline and tripId
  // are the only values that should re-trigger the drain.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, tripId]);

  async function handleToggle(
    task: TodayTask,
    currentlyCompleted: boolean,
    completionId?: Id<"taskCompletions">,
  ) {
    if (currentlyCompleted && completionId) {
      const completion = completionMap.get(task.taskRef);
      setPendingUncheck({ completionId, hasProof: !!completion?.proofPhotoUrl });
      return;
    } else if (!currentlyCompleted) {
      // Proof-required tasks must be completed via the upload flow, not a bare tap
      if (task.proofRequired) {
        handleProofClick(task);
        return;
      }

      const sitterName = getSitterName();
      const completedAt = Date.now();
      // Unique ID for this queue entry (tripId+taskRef+ms is collision-resistant)
      const entryId = `${tripId}:${task.taskRef}:${completedAt}`;

      // Step 1 — Write to queue immediately (offline-first, before network call)
      enqueue(tripId, {
        id: entryId,
        tripId,
        taskRef: task.taskRef,
        taskType: task.taskType,
        completedAt,
        sitterName,
      });

      // Step 2 — Show as checked in local state immediately
      setPendingTaskRefs((prev) => new Set([...prev, task.taskRef]));

      // Step 3 — Attempt Convex mutation
      try {
        await completeTask({
          tripId: tripId as Id<"trips">,
          taskRef: task.taskRef,
          taskType: task.taskType,
          sitterName,
          completedAt,
        });
        // Mutation succeeded: remove from queue (liveData update will clean state)
        dequeue(tripId, entryId);
        setPendingTaskRefs((prev) => {
          const next = new Set(prev);
          next.delete(task.taskRef);
          return next;
        });
      } catch {
        // Mutation failed (offline or server error) — keep in queue and local state
        // The drain effect will retry when the device comes back online.
      }
    }
  }

  // ── Proof photo upload flow ────────────────────────────────────────

  function handleProofClick(task: TodayTask) {
    setPendingProofTask(task);
    const name = getSitterName();
    if (name) {
      // Already have name — skip prompt and open file picker
      pendingProofNameRef.current = name;
      fileInputRef.current?.click();
    } else {
      setShowNamePrompt(true);
    }
  }

  function handleNameConfirm(name: string) {
    setSitterName(name);
    pendingProofNameRef.current = name;
    setShowNamePrompt(false);
    // Open file picker after name is confirmed
    setTimeout(() => fileInputRef.current?.click(), 50);
  }

  function handleNameCancel() {
    setShowNamePrompt(false);
    setPendingProofTask(null);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pendingProofTask) return;

    // Reset the input so the same file can be re-selected if needed
    e.target.value = "";

    const task = pendingProofTask;
    setPendingProofTask(null);

    const sitterName = pendingProofNameRef.current || getSitterName();
    const completedAt = Date.now();

    if (!isOnline) {
      // Offline: store blob to IndexedDB, show task as completed locally.
      // The photo drain effect will upload when the device reconnects.
      const entryId = `photo:${tripId}:${task.taskRef}:${completedAt}`;
      try {
        await enqueuePhoto({
          id: entryId,
          tripId,
          taskRef: task.taskRef,
          taskType: task.taskType,
          blob: file,
          completedAt,
          sitterName,
        });
        setPendingUploadCount((prev) => prev + 1);
        setPendingTaskRefs((prev) => new Set([...prev, task.taskRef]));
      } catch (err) {
        console.error("[ProofUpload] Failed to queue offline photo:", err);
      }
      return;
    }

    // Online: direct upload flow
    setUploadingTaskRef(task.taskRef);
    try {
      // 1. Get a one-time upload URL from Convex
      const uploadUrl = await generateUploadUrl({});

      // 2. Upload the file directly to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      const { storageId } = (await response.json()) as { storageId: string };

      // 3. Complete the task with the proof photo URL
      await completeTaskWithProof({
        tripId: tripId as Id<"trips">,
        taskRef: task.taskRef,
        taskType: task.taskType,
        sitterName,
        storageId: storageId as Id<"_storage">,
      });
    } catch (err) {
      console.error("[ProofUpload] Failed:", err);
    } finally {
      setUploadingTaskRef(null);
    }
  }

  // Show skeleton only on the very first load (no live data AND no cached fallback)
  if (liveData === undefined && cachedData === null) return <LoadingSkeleton />;
  if (data === null) return <TripNotFound />;

  const { trip, property, sitters, emergencyContacts, recurringInstructions, todayOverlayItems, completions } =
    data as {
      trip: { startDate: string; endDate: string };
      property: { _id: Id<"properties">; name: string } | null;
      sitters: Array<{ name: string }>;
      emergencyContacts: Array<{ name: string; role: string; phone: string; notes?: string; isLocked: boolean }>;
      recurringInstructions: Array<{ _id: string; text: string; timeSlot: string; proofRequired: boolean; locationCard?: LocationCardData }>;
      todayOverlayItems: Array<{ _id: string; text: string; timeSlot: string; proofRequired: boolean; locationCard?: LocationCardData }>;
      tomorrowRecurringInstructions: Array<{ _id: string; text: string; timeSlot: string; proofRequired: boolean; locationCard?: LocationCardData }>;
      tomorrowOverlayItems: Array<{ _id: string; text: string; timeSlot: string; proofRequired: boolean; locationCard?: LocationCardData }>;
      completions: Array<{ _id: Id<"taskCompletions">; taskRef: string; proofPhotoUrl?: string }>;
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

  // Build a map of taskRef → completion info for O(1) lookup.
  // Includes both server-confirmed completions and locally-queued (offline) ones.
  // Offline entries have no id so the uncheck flow won't trigger for them.
  const completionMap = new Map<string, CompletionInfo>(
    completions.map((c) => [c.taskRef, { id: c._id as Id<"taskCompletions">, proofPhotoUrl: c.proofPhotoUrl }]),
  );
  for (const taskRef of pendingTaskRefs) {
    if (!completionMap.has(taskRef)) {
      completionMap.set(taskRef, { id: undefined, proofPhotoUrl: undefined });
    }
  }

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
      {/* ── Offline sync banner ─────────────────────────────────────── */}
      {!isOnline && <OfflineBanner />}

      {/* ── Sitter conversion banner (online only, dismissible) ──────── */}
      {isOnline && <SitterConversionBanner tripId={tripId} />}

      {/* ── Hidden file input for proof photo ──────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
        aria-hidden="true"
      />

      {/* ── Proof photo viewer ──────────────────────────────────────── */}
      {selectedPhotoUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(42,31,26,0.85)] animate-location-fade-in"
          onClick={() => setSelectedPhotoUrl(null)}
          role="dialog"
          aria-label="Proof photo"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Escape") setSelectedPhotoUrl(null); }}
        >
          <button
            type="button"
            className="absolute top-4 right-4 flex items-center justify-center w-11 h-11 rounded-round bg-[rgba(255,255,255,0.15)] text-white cursor-pointer transition-[background-color] duration-150 ease-out hover:bg-[rgba(255,255,255,0.3)]"
            onClick={() => setSelectedPhotoUrl(null)}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedPhotoUrl}
            alt="Proof photo"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-md"
            style={{ touchAction: "pinch-zoom" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Uncheck confirmation sheet ──────────────────────────────── */}
      {pendingUncheck && (
        <UncheckConfirmSheet
          hasProof={pendingUncheck.hasProof}
          onConfirm={async () => {
            await removeCompletion({ taskCompletionId: pendingUncheck.completionId });
            setPendingUncheck(null);
          }}
          onCancel={() => setPendingUncheck(null)}
        />
      )}

      {/* ── Name prompt modal ───────────────────────────────────────── */}
      {showNamePrompt && (
        <NamePrompt
          initialName={getSitterName()}
          onConfirm={handleNameConfirm}
          onCancel={handleNameCancel}
        />
      )}

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

          {/* Pending photo upload badge — shown when offline photos are queued */}
          {pendingUploadCount > 0 && (
            <div aria-live="polite" role="status" className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-light text-accent font-body text-xs font-medium px-3 py-1.5">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
                {pendingUploadCount} photo{pendingUploadCount !== 1 ? "s" : ""} waiting to upload
              </span>
            </div>
          )}
          {failedUploadCount > 0 && (
            <div role="alert" className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-danger-light text-danger font-body text-xs font-medium px-3 py-1.5">
                Some photos failed to upload
              </span>
            </div>
          )}

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
                  uploadingTaskRef={uploadingTaskRef}
                  onToggle={handleToggle}
                  onProof={handleProofClick}
                  onPhotoClick={setSelectedPhotoUrl}
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
      {activeTab === "manual" && property && (
        <ManualTab propertyId={property._id} />
      )}
    </SitterLayout>
  );
}
