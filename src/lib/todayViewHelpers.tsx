// Shared helpers for Today View rendering (used by TodayPageInner and PreviewPageInner)

export type SlotKey = "morning" | "afternoon" | "evening" | "anytime";

export interface LocationCardData {
  photoUrl?: string;
  videoUrl?: string;
  caption?: string;
  roomTag?: string;
}

export interface TodayTask {
  id: string;
  text: string;
  timeSlot: SlotKey;
  specificTime?: string;
  specificTimeEnd?: string;
  isOverlay: boolean;
  proofRequired: boolean;
  taskRef: string;
  taskType: "recurring" | "overlay";
  locationCard?: LocationCardData;
}

export const SLOT_ORDER: SlotKey[] = ["morning", "afternoon", "evening", "anytime"];

/** Format "HH:mm" as "7:00 AM" style. */
export function formatTime12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Format a time range: "9:00 AM – 11:00 AM" or just "9:00 AM" if no end. */
export function formatTimeRange(start: string, end?: string): string {
  if (!end) return formatTime12h(start);
  return `${formatTime12h(start)} – ${formatTime12h(end)}`;
}

/** Returns true if end time is strictly after start time (same day only). */
export function isValidTimeRange(start: string, end: string): boolean {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em > sh * 60 + sm;
}

export function buildTaskList(
  recurringInstructions: Array<{
    _id: string;
    text: string;
    timeSlot: string;
    specificTime?: string;
    specificTimeEnd?: string;
    proofRequired: boolean;
    locationCard?: LocationCardData;
  }>,
  overlayItems: Array<{
    _id: string;
    text: string;
    timeSlot: string;
    specificTime?: string;
    specificTimeEnd?: string;
    proofRequired: boolean;
    locationCard?: LocationCardData;
  }>,
  today: string,
): TodayTask[] {
  const recurring: TodayTask[] = recurringInstructions.map((inst) => ({
    id: inst._id,
    text: inst.text,
    timeSlot: inst.timeSlot as SlotKey,
    specificTime: inst.specificTime,
    specificTimeEnd: inst.specificTimeEnd,
    isOverlay: false,
    proofRequired: inst.proofRequired,
    taskRef: `recurring:${inst._id}:${today}`,
    taskType: "recurring" as const,
    locationCard: inst.locationCard,
  }));

  const overlay: TodayTask[] = overlayItems.map((item) => ({
    id: item._id,
    text: item.text,
    timeSlot: item.timeSlot as SlotKey,
    specificTime: item.specificTime,
    specificTimeEnd: item.specificTimeEnd,
    isOverlay: true,
    proofRequired: item.proofRequired,
    taskRef: `overlay:${item._id}`,
    taskType: "overlay" as const,
    locationCard: item.locationCard,
  }));

  return [...recurring, ...overlay];
}

/** Sort tasks within a slot: tasks with specificTime first (by time), then the rest. */
export function sortWithinSlot(tasks: TodayTask[]): TodayTask[] {
  return [...tasks].sort((a, b) => {
    if (a.specificTime && !b.specificTime) return -1;
    if (!a.specificTime && b.specificTime) return 1;
    if (a.specificTime && b.specificTime) return a.specificTime.localeCompare(b.specificTime);
    return 0;
  });
}

/** Filter tasks on first/last day based on trip start/end times. */
export function filterTasksByTripTime(
  tasks: TodayTask[],
  trip: { startDate: string; endDate: string; startTime?: string; endTime?: string },
  today: string,
): TodayTask[] {
  const isFirstDay = today === trip.startDate && !!trip.startTime;
  const isLastDay = today === trip.endDate && !!trip.endTime;
  if (!isFirstDay && !isLastDay) return tasks;

  return tasks.filter((task) => {
    // Always keep anytime tasks
    if (task.timeSlot === "anytime") return true;

    // First day: hide tasks before trip start
    if (isFirstDay && trip.startTime) {
      if (task.specificTime) {
        if (task.specificTime < trip.startTime) return false;
      } else {
        // Slot-only: hide if entire slot ends before startTime
        // morning ends at 12:00, afternoon ends at 17:00
        if (task.timeSlot === "morning" && trip.startTime >= "12:00") return false;
        if (task.timeSlot === "afternoon" && trip.startTime >= "17:00") return false;
      }
    }

    // Last day: hide tasks after trip end
    if (isLastDay && trip.endTime) {
      if (task.specificTime) {
        if (task.specificTime > trip.endTime) return false;
      } else {
        // Slot-only: hide if slot starts after endTime
        // afternoon starts at 12:00, evening starts at 17:00
        if (task.timeSlot === "afternoon" && trip.endTime < "12:00") return false;
        if (task.timeSlot === "evening" && trip.endTime < "17:00") return false;
      }
    }

    return true;
  });
}

export function groupBySlot(tasks: TodayTask[]): Record<SlotKey, TodayTask[]> {
  const groups: Record<SlotKey, TodayTask[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    anytime: [],
  };
  for (const task of tasks) {
    groups[task.timeSlot].push(task);
  }
  // Sort within each slot: timed tasks first
  for (const slot of SLOT_ORDER) {
    groups[slot] = sortWithinSlot(groups[slot]);
  }
  return groups;
}

export function getTripDay(startDate: string, today: string): number {
  const start = Date.UTC(
    ...startDate.split("-").map(Number) as [number, number, number],
  );
  const curr = Date.UTC(
    ...today.split("-").map(Number) as [number, number, number],
  );
  return Math.max(1, Math.floor((curr - start) / 86_400_000) + 1);
}

export function getTripLength(startDate: string, endDate: string): number {
  const start = Date.UTC(
    ...startDate.split("-").map(Number) as [number, number, number],
  );
  const end = Date.UTC(
    ...endDate.split("-").map(Number) as [number, number, number],
  );
  return Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
}

/** Anytime divider — not part of TimeSlotDivider component */
export function AnytimeDivider() {
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
