/**
 * Offline photo upload queue using IndexedDB.
 *
 * When the sitter selects a proof photo while offline, the blob is stored here.
 * On reconnect the queue is drained: each entry is uploaded to Convex storage
 * and the task is completed with the original completedAt timestamp.
 *
 * Uses IndexedDB (not localStorage) because IndexedDB supports binary blob
 * storage natively — localStorage is limited to strings.
 */

const DB_NAME = "vadem_photo_uploads";
const DB_VERSION = 1;
const STORE_NAME = "pending_uploads";

export const MAX_PHOTO_RETRIES = 3;

export type PhotoUploadStatus = "pending" | "permanently_failed";

export interface PendingPhotoUpload {
  /** Client-generated UUID for this queue entry. */
  id: string;
  tripId: string;
  taskRef: string;
  taskType: "recurring" | "overlay";
  /** The original photo file/blob — stored as binary in IndexedDB. */
  blob: Blob;
  /** Unix ms — when the sitter tapped the proof button. Preserved for sync. */
  completedAt: number;
  sitterName: string;
  /** Number of upload attempts made (0 = never attempted). */
  retryCount: number;
  /** Unix ms — time of last upload attempt, or null if never attempted. */
  lastAttemptAt: number | null;
  status: PhotoUploadStatus;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by_trip", "tripId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add a pending photo upload to the queue.
 * Skips if a pending entry with the same taskRef already exists for this trip.
 */
export async function enqueuePhoto(
  entry: Omit<PendingPhotoUpload, "retryCount" | "lastAttemptAt" | "status">,
): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("by_trip");
    const req = index.getAll(entry.tripId);
    req.onsuccess = () => {
      const existing = req.result as PendingPhotoUpload[];
      if (existing.some((e) => e.taskRef === entry.taskRef && e.status === "pending")) {
        resolve();
        return;
      }
      const putReq = store.put({
        ...entry,
        retryCount: 0,
        lastAttemptAt: null,
        status: "pending" as const,
      });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get all pending (non-permanently-failed) photo uploads for a trip,
 * ordered by completedAt ascending so uploads process in the original order.
 */
export async function getPhotoQueue(tripId: string): Promise<PendingPhotoUpload[]> {
  if (typeof window === "undefined") return [];
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("by_trip");
      const req = index.getAll(tripId);
      req.onsuccess = () => {
        const all = req.result as PendingPhotoUpload[];
        resolve(
          all
            .filter((e) => e.status === "pending")
            .sort((a, b) => a.completedAt - b.completedAt),
        );
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Get pending and permanently-failed counts for a trip.
 */
export async function getPhotoCounts(
  tripId: string,
): Promise<{ pending: number; failed: number }> {
  if (typeof window === "undefined") return { pending: 0, failed: 0 };
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("by_trip");
      const req = index.getAll(tripId);
      req.onsuccess = () => {
        const all = req.result as PendingPhotoUpload[];
        resolve({
          pending: all.filter((e) => e.status === "pending").length,
          failed: all.filter((e) => e.status === "permanently_failed").length,
        });
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return { pending: 0, failed: 0 };
  }
}

/**
 * Remove a successfully uploaded entry from the queue.
 */
export async function removePhotoEntry(id: string): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Record a failed upload attempt: increment retryCount and set lastAttemptAt.
 */
export async function recordPhotoRetry(id: string, newRetryCount: number): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const entry = getReq.result as PendingPhotoUpload | undefined;
      if (!entry) {
        resolve();
        return;
      }
      const putReq = store.put({
        ...entry,
        retryCount: newRetryCount,
        lastAttemptAt: Date.now(),
      });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Mark an entry as permanently failed after MAX_PHOTO_RETRIES attempts.
 */
export async function markPhotoFailed(id: string): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const entry = getReq.result as PendingPhotoUpload | undefined;
      if (!entry) {
        resolve();
        return;
      }
      const putReq = store.put({ ...entry, status: "permanently_failed" as const });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}
