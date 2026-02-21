/**
 * Offline persistence helpers for the sitter trip view.
 *
 * When the sitter is online, Convex provides live data via WebSocket. This
 * module persists that data to localStorage so the sitter can see their last-
 * known instructions, contacts, and pet info after reopening the browser
 * offline (when Convex cannot reconnect).
 *
 * It also handles postMessage communication with the service worker:
 *  • MANUAL_VERSION_CHECK — tells the SW to evict stale photo/content caches
 *    if the owner has updated the manual since the last visit.
 *  • CACHE_TRIP_DATA — asks the SW to durably persist JSON trip data in Cache
 *    Storage so it survives memory pressure on mobile.
 */

const STORAGE_PREFIX = "vadem_trip_";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface PersistedTripData<T> {
  data: T;
  savedAt: number;
  propertyId: string;
  manualVersion: number;
}

// ── localStorage helpers ───────────────────────────────────────────────────

export function saveTripData<T>(
  tripId: string,
  propertyId: string,
  manualVersion: number,
  data: T,
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedTripData<T> = {
      data,
      savedAt: Date.now(),
      propertyId,
      manualVersion,
    };
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors — offline data is best-effort
  }
}

export function loadTripData<T>(tripId: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tripId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTripData<T>;
    // Expire after MAX_AGE_MS
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(`${STORAGE_PREFIX}${tripId}`);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function clearTripData(tripId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${tripId}`);
  } catch {
    // ignore
  }
}

// ── Service worker messaging ──────────────────────────────────────────────

/**
 * Post the current manualVersion to the service worker. The SW compares it
 * against the last-seen version for this property and, if different, evicts
 * the stale photo/content caches so fresh assets are fetched on next load.
 */
export function notifySwManualVersion(
  propertyId: string,
  version: number,
): void {
  if (typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker.controller;
  if (!sw) return;
  sw.postMessage({
    type: "MANUAL_VERSION_CHECK",
    propertyId,
    version,
  });
}

/**
 * Ask the SW to persist a serialisable payload in Cache Storage under the
 * given key. This is more durable than localStorage on low-memory devices.
 */
export function swCacheTripData(key: string, payload: unknown): void {
  if (typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker.controller;
  if (!sw) return;
  sw.postMessage({ type: "CACHE_TRIP_DATA", key, payload });
}
