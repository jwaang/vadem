/// <reference lib="webworker" />

const CACHE_NAME = "handoff-v1";
const PRECACHE_URLS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  self.clients.claim();
});

/** Returns true if this request is for a Convex storage file (not a video fetch). */
function isConvexStorageRequest(url, request) {
  // Convex storage URLs: https://<deployment>.convex.cloud/api/storage/<id>
  if (!url.hostname.endsWith(".convex.cloud")) return false;
  if (!url.pathname.startsWith("/api/storage/")) return false;
  // Skip cache-first for video requests (large files per Epic 12 strategy)
  const accept = request.headers.get("accept") ?? "";
  if (accept.startsWith("video/")) return false;
  return true;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never intercept auth callbacks — OAuth redirects must reach the app directly
  if (url.pathname.startsWith("/auth/callback")) return;

  // Cache-first strategy for Convex storage image URLs (offline support for location cards)
  if (isConvexStorageRequest(url, event.request)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      }),
    );
    return;
  }

  // Network-first for all other requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
