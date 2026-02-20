# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

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
