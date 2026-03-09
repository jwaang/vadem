export type TimedTask = {
  text: string;
  specificTime: string; // "HH:mm"
  specificTimeEnd?: string; // "HH:mm" for range tasks
  taskRef: string;
};

export function formatTime12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Filter tasks to those relevant for a reminder:
 * - Upcoming (start time >= reminder time), OR
 * - Past start time but still incomplete
 */
export function filterRelevantTasks(
  allTasks: TimedTask[],
  completedRefs: Set<string>,
  reminderTime: string,
): TimedTask[] {
  return allTasks.filter((t) => {
    if (t.specificTime >= reminderTime) return true;
    if (!completedRefs.has(t.taskRef)) return true;
    return false;
  });
}

export type BucketResult = {
  overdue: TimedTask[];
  active: TimedTask[];
  upcoming: TimedTask[];
};

/**
 * Bucket relevant tasks into overdue, active (in progress), and upcoming.
 *
 * - Overdue: point-in-time tasks (no end time) whose time has passed, incomplete
 * - Active: range tasks whose start has passed (<=), incomplete
 * - Upcoming: tasks whose start time hasn't been reached yet (>)
 */
export function bucketTasks(
  relevantTasks: TimedTask[],
  completedRefs: Set<string>,
  reminderTime: string,
): BucketResult {
  const overdue = relevantTasks.filter(
    (t) =>
      !t.specificTimeEnd &&
      t.specificTime < reminderTime &&
      !completedRefs.has(t.taskRef),
  );
  const active = relevantTasks.filter(
    (t) =>
      !!t.specificTimeEnd &&
      t.specificTime <= reminderTime &&
      !completedRefs.has(t.taskRef),
  );
  const upcoming = relevantTasks.filter(
    (t) => t.specificTime > reminderTime,
  );

  return { overdue, active, upcoming };
}

/**
 * Build the SMS reminder body from bucketed tasks and anytime count.
 * Returns null if there's nothing to report.
 */
export function buildReminderBody(
  overdue: TimedTask[],
  active: TimedTask[],
  upcoming: TimedTask[],
  incompleteAnytimeCount: number,
): string | null {
  const anytimeSuffix =
    incompleteAnytimeCount > 0
      ? ` You also have ${incompleteAnytimeCount} other ${incompleteAnytimeCount === 1 ? "task" : "tasks"} to complete.`
      : "";

  const parts: string[] = [];
  if (overdue.length > 0) {
    parts.push(
      `${overdue.length} overdue ${overdue.length === 1 ? "task" : "tasks"}`,
    );
  }
  if (active.length > 0) {
    parts.push(
      `${active.length} ${active.length === 1 ? "task" : "tasks"} in progress`,
    );
  }
  if (upcoming.length > 0) {
    const nextTime = formatTime12h(upcoming[0].specificTime);
    parts.push(
      `${upcoming.length} upcoming ${upcoming.length === 1 ? "task" : "tasks"}, next at ${nextTime}`,
    );
  }

  if (parts.length > 0) {
    const joined =
      parts.length === 1
        ? parts[0]
        : parts.length === 2
          ? `${parts[0]} and ${parts[1]}`
          : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
    return `Vadem: You have ${joined}.${anytimeSuffix}`;
  } else if (incompleteAnytimeCount > 0) {
    const taskWord = incompleteAnytimeCount === 1 ? "task" : "tasks";
    return `Vadem: You still have ${incompleteAnytimeCount} ${taskWord} to complete today.`;
  }

  return null;
}
