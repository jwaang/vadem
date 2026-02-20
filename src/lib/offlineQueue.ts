/**
 * Offline task completion queue.
 *
 * When the sitter checks off a task while offline (or when the Convex mutation
 * fails due to a connectivity issue), the completion is written here first.
 * On reconnect the queue is drained: each entry is submitted to Convex with
 * the original completedAt timestamp so the owner sees when the task was
 * actually completed — not when it finally synced.
 *
 * Storage: localStorage (same pattern used by offlineTripData.ts). The queue
 * is small (a handful of completions per trip), so localStorage is sufficient.
 */

const QUEUE_PREFIX = "handoff_pending_completions_";

export interface PendingCompletion {
  /** Client-generated UUID for this queue entry. */
  id: string;
  tripId: string;
  taskRef: string;
  taskType: "recurring" | "overlay";
  /** Unix ms — when the sitter actually tapped the checkbox. */
  completedAt: number;
  sitterName: string;
  retryCount: number;
}

function queueKey(tripId: string): string {
  return `${QUEUE_PREFIX}${tripId}`;
}

function readQueue(tripId: string): PendingCompletion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(queueKey(tripId));
    if (!raw) return [];
    return JSON.parse(raw) as PendingCompletion[];
  } catch {
    return [];
  }
}

function writeQueue(tripId: string, queue: PendingCompletion[]): void {
  if (typeof window === "undefined") return;
  try {
    if (queue.length === 0) {
      localStorage.removeItem(queueKey(tripId));
    } else {
      localStorage.setItem(queueKey(tripId), JSON.stringify(queue));
    }
  } catch {
    // Ignore storage quota errors — offline queue is best-effort
  }
}

/**
 * Returns all pending completions for a trip (newest last).
 */
export function getQueue(tripId: string): PendingCompletion[] {
  return readQueue(tripId);
}

/**
 * Add a pending completion to the queue.
 * No-ops if an entry with the same taskRef already exists (prevents UI
 * double-tap races from creating duplicate queue items).
 */
export function enqueue(
  tripId: string,
  entry: Omit<PendingCompletion, "retryCount">,
): void {
  const queue = readQueue(tripId);
  if (queue.some((e) => e.taskRef === entry.taskRef)) return;
  writeQueue(tripId, [...queue, { ...entry, retryCount: 0 }]);
}

/**
 * Remove a specific entry from the queue by its id.
 * Called after a successful Convex mutation confirms the completion.
 */
export function dequeue(tripId: string, id: string): void {
  const queue = readQueue(tripId);
  writeQueue(
    tripId,
    queue.filter((e) => e.id !== id),
  );
}

/**
 * Remove all entries whose taskRefs are now present in Convex completions.
 * Called whenever liveData arrives so stale queue entries are cleaned up
 * automatically (e.g. synced via another device or tab).
 *
 * Returns true if any items were removed.
 */
export function removeByTaskRefs(
  tripId: string,
  syncedRefs: Set<string>,
): boolean {
  const queue = readQueue(tripId);
  const filtered = queue.filter((e) => !syncedRefs.has(e.taskRef));
  if (filtered.length === queue.length) return false;
  writeQueue(tripId, filtered);
  return true;
}

/**
 * Increment the retry count for a queue entry that failed to sync.
 */
export function incrementRetry(tripId: string, id: string): void {
  const queue = readQueue(tripId);
  writeQueue(
    tripId,
    queue.map((e) => (e.id === id ? { ...e, retryCount: e.retryCount + 1 } : e)),
  );
}
