# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

### IndexedDB photo upload queue pattern
Use IndexedDB (not localStorage) for offline photo blobs since localStorage is string-only. Schema: single `pending_uploads` object store keyed by `id` with a `by_trip` index. Entries: `{ id, tripId, taskRef, taskType, blob, completedAt, sitterName, retryCount, lastAttemptAt, status }`. On reconnect, fire all pending entries concurrently with `processPhotoEntry(entry)`. On failure, increment `retryCount` and schedule retry via `setTimeout(2^retryCount * 1000)`. After MAX_PHOTO_RETRIES (3) mark as `permanently_failed` and show error badge. Clean up IndexedDB entries in the liveData effect (same `syncedRefs` set used for localStorage queue cleanup). Photo drain effect must be declared AFTER `completeTaskWithProof` and `generateUploadUrl` (TDZ ordering).

### completeTaskWithProof dedup + completedAt override
Like `completeTask`, add `completedAt: v.optional(v.number())` to `completeTaskWithProof` and add `by_trip_taskref` dedup check at the top of the handler. Access `args.completedAt ?? Date.now()` directly (no destructuring needed since the insert is built manually, not spread from args).


### Offline-first task queue pattern
Queue task check-offs to localStorage before attempting the Convex mutation. Keep a `pendingTaskRefs` React state (Set) that renders pending items as checked. Merge with `completionMap` at render time — pending entries get `id: undefined` so the uncheck dialog can't be triggered on unsynced items. Clean up queue entries by watching `liveData.completions` in a useEffect (calls `removeByTaskRefs`). Drain on reconnect via `online` event handler; pass original `completedAt` to `completeTask` for accurate timestamps. Deduplication is enforced server-side (query `by_trip_taskref` before insert) and client-side (queue `enqueue` skips duplicate taskRef).

### completeTask deduplication + completedAt override
The `completeTask` mutation now accepts `completedAt: v.optional(v.number())`. Server checks for existing completion via `by_trip_taskref` index and returns existing ID if found (idempotent). Destructure `completedAt` out of args before spreading into `db.insert` to avoid type conflict with the computed value.


### Internal version bumping via scheduler
When mutations don't have direct access to `propertyId` (e.g. instructions only have `sectionId`), use an intermediate lookup then schedule the version bump:
```ts
const section = await ctx.db.get(args.sectionId);
if (section) {
  await ctx.scheduler.runAfter(0, internal.properties.bumpManualVersion, {
    propertyId: section.propertyId,
  });
}
```

### SW multi-bucket caching pattern
Three cache buckets: `handoff-app-shell-v1` (cache-first for `_next/static/*`), `handoff-photos-v1` (cache-first for Convex storage images, cache-on-play for video), `handoff-content-v1` (network-first with fallback). Version metadata stored in `handoff-content-v1` as synthetic responses under `/__version__/{propertyId}`.

### Offline Convex data fallback
Since Convex uses WebSocket (not interceptable by SW), persist live query data to `localStorage` via `saveTripData()`. On mount, `loadTripData()` hydrates `cachedData`. Render uses `liveData ?? cachedData` — skeleton only shown when both are null/undefined.

### SW postMessage for cache invalidation
Page calls `notifySwManualVersion(propertyId, version)` after each Convex data load. SW compares version to stored meta; on mismatch, evicts `handoff-photos-v1` and cached trip data, then stores new version.

---

## 2026-02-20 - US-083
- **What was implemented**: Vault online-only enforcement — service worker exclusion, offline UI, and cache audit.
- **Files changed**:
  - `public/sw.js` — added explicit pass-through (no caching) for any GET request whose URL contains "vault" or "getdecryptedvaultitems", inserted early in the fetch handler before any cache branches
  - `src/app/t/[tripId]/VaultTab.tsx` — added `isOnline` state (initialized from `navigator.onLine`) + `online`/`offline` event listeners; added offline render branch that shows a vault lock icon + "Connect to the internet to access secure items" message (bg-bg-raised rounded-xl p-8, font-body text-text-muted) — appears before any phase/trip-status checks so it fires unconditionally
- **Cache audit findings** (no code changes needed):
  - Vault decrypted items are fetched via `useAction` (HTTP POST) — already excluded from SW caching by the `method !== 'GET'` guard on line 80 of sw.js
  - `saveTripData` / `swCacheTripData` only persist `liveData` from `useQuery(api.trips.getTodayData)` — vault data is never part of that query result
  - `decryptedItems` in VaultTab lives in React state only — never written to localStorage, IndexedDB, or Cache Storage
  - Convex client cache is in-memory only; vault query/action results are not persisted
- **Learnings:**
  - `useCallback` is the right wrapper for event handler setters passed to `addEventListener` so ESLint `react-hooks/exhaustive-deps` is satisfied and the cleanup effect references stable references
  - The online-only guard must fire BEFORE `tripStatus` checks (and all other phase logic) so the user never sees a stale "access denied" or "initial" vault state while offline — the offline message is always authoritative
  - Convex actions (called via `useAction`) are POST requests and therefore never intercepted by the SW's fetch handler (which has `method !== 'GET'` early-return). The explicit vault URL exclusion is defense-in-depth for any future GET-based vault endpoints.
---

## 2026-02-20 - US-082
- **What was implemented**: Offline photo proof queue — IndexedDB blob storage, upload badge, reconnect drain with exponential backoff, and original timestamp preservation.
- **Files changed**:
  - `src/lib/photoUploadQueue.ts` — new file: IndexedDB store `pending_uploads`, `enqueuePhoto`, `getPhotoQueue`, `getPhotoCounts`, `removePhotoEntry`, `recordPhotoRetry`, `markPhotoFailed`, `MAX_PHOTO_RETRIES`
  - `convex/taskCompletions.ts` — added `completedAt: v.optional(v.number())` to `completeTaskWithProof` args; added `by_trip_taskref` dedup check at top of handler (idempotent for offline retry safety)
  - `src/app/t/[tripId]/TodayPageInner.tsx` — added `pendingUploadCount` + `failedUploadCount` states + `photoDrainInProgressRef`; mount effect loads IndexedDB counts and adds photo taskRefs to `pendingTaskRefs`; liveData effect cleans up confirmed IndexedDB entries; photo drain useEffect fires on reconnect (fires concurrent uploads with exponential backoff); `handleFileSelected` checks `isOnline` — offline path stores to IndexedDB + updates badge + adds to pendingTaskRefs; added pending upload badge chip (bg-accent-light text-accent, rounded-pill) and failed badge (bg-danger-light text-danger) in Today tab
- **Learnings:**
  - React hooks in useEffect closures don't have TDZ issues at runtime (closures are evaluated when called, not when defined), but TypeScript/ESLint static analysis still requires declarations to appear before the effect that references them. Moved photo drain effect AFTER `completeTaskWithProof` and `generateUploadUrl` declarations.
  - For concurrent offline uploads, fire all entries in parallel (each manages its own backoff via setTimeout). This matches natural offline behavior where multiple tasks were completed before reconnecting.
  - `getPhotoCounts` runs at mount via useEffect (async), not `useState` initializer, because IndexedDB is always async. To also add photo taskRefs to `pendingTaskRefs`, run `getPhotoQueue` in the same mount effect and fold them in with `setPendingTaskRefs((prev) => new Set([...prev, ...entries.map(e => e.taskRef)]))`.
  - For the liveData cleanup: use the same `syncedRefs` Set (already built for localStorage cleanup) to filter IndexedDB entries that are now server-confirmed. This handles edge cases where another device uploaded the proof.
---

## 2026-02-20 - US-081
- **What was implemented**: Offline task check-off with sync — localStorage queue, online/offline detection, queue drain on reconnect, deduplication, original timestamps, and "offline — will sync" banner.
- **Files changed**:
  - `src/lib/offlineQueue.ts` — new file: `PendingCompletion` type, `getQueue`, `enqueue`, `dequeue`, `removeByTaskRefs`, `incrementRetry`
  - `convex/taskCompletions.ts` — added `completedAt: v.optional(v.number())` to `completeTask` args; added dedup check (query `by_trip_taskref` before insert, return existing ID if found); destructure `completedAt` from args before spread to avoid type conflict
  - `src/app/t/[tripId]/TodayPageInner.tsx` — added `isOnline` state + `online`/`offline` event listeners; `pendingTaskRefs` state initialized from localStorage queue; updated `liveData` effect to call `removeByTaskRefs` for cleanup; added `drainInProgressRef` + drain `useEffect` that fires when `isOnline → true`; updated `handleToggle` to: write to queue first → update `pendingTaskRefs` → attempt mutation → dequeue on success / keep on failure; merged `pendingTaskRefs` into `completionMap` with `id: undefined` (prevents uncheck dialog); added `OfflineBanner` component; render banner when `!isOnline`; made `CompletionInfo.id` optional
- **Learnings:**
  - When merging offline-queued items into `completionMap`, setting `id: undefined` is the key trick to prevent the uncheck confirmation sheet from showing for items that haven't synced yet — the `handleToggle` guard `if (currentlyCompleted && completionId)` naturally skips them.
  - Destructure `completedAt` out of Convex mutation args before `...spread` into `db.insert`. Spreading `{ ...args, completedAt }` when args has `completedAt: optional` creates a TypeScript type conflict; destructuring cleanly separates the optional from the computed required value.
  - `drainInProgressRef` prevents duplicate drain loops if the `isOnline` effect fires multiple times. Reset the ref to `false` on `offline` so the next `online` event triggers a fresh drain.
  - The `OfflineBanner` must be positioned `bottom-[calc(72px+env(safe-area-inset-bottom))]` to sit above the sticky bottom nav (which is also `72px + safe-area`). Using `z-30` keeps it below modals (`z-50`) but above content.
---

## 2026-02-20 - US-080
- **What was implemented**: Service worker caching for offline sitter view — multi-bucket strategy, video-on-play caching, version-based cache invalidation, and localStorage fallback for Convex WebSocket data.
- **Files changed**:
  - `convex/schema.ts` — added `manualVersion: v.optional(v.number())` to `properties` table
  - `convex/properties.ts` — added `manualVersion` to `propertyObject` validator; added `bumpManualVersion` `internalMutation`
  - `convex/sections.ts` — calls `bumpManualVersion` on `create` and `remove`
  - `convex/instructions.ts` — calls `bumpManualVersion` on `create`, `update`, and `remove` (via section lookup)
  - `convex/pets.ts` — calls `bumpManualVersion` on `create` and `remove`
  - `public/sw.js` — full rewrite: 3 cache buckets, video destination check, `message` event handler for version checks and data persistence
  - `src/lib/offlineTripData.ts` — new file: `saveTripData`, `loadTripData`, `clearTripData`, `notifySwManualVersion`, `swCacheTripData`
  - `src/app/t/[tripId]/TodayPageInner.tsx` — added offline persistence hooks; changed `data` resolution to `liveData ?? cachedData`; skeleton only shown when both are null
- **Learnings:**
  - Convex React client uses WebSocket (not HTTP fetch), so SW cannot intercept query responses directly. Offline content caching requires client-side localStorage persistence with `liveData ?? cachedData` fallback pattern.
  - Service worker `destination` property on `Request` is the most reliable way to detect video fetch vs image fetch (better than checking Accept headers alone).
  - Storing SW version metadata as synthetic `Response` objects in Cache Storage (under fake `/__version__/` URLs) avoids needing IndexedDB just for version tracking.
  - `ctx.scheduler.runAfter(0, internal.xxx, args)` is the correct Convex pattern for calling internal mutations from within another mutation — direct `ctx.runMutation` is not available.
  - The `propertyObject` validator in `properties.ts` must include all fields that can be returned from DB reads, including newly-added optional fields, or TypeScript will reject callers.
---
