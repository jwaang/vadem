/// <reference lib="webworker" />

// ── Cache bucket names ─────────────────────────────────────────────────────
// Bump the version suffix to force a full cache purge on deploy.
const APP_SHELL_CACHE = "vadem-app-shell-v3";
const CONTENT_CACHE = "vadem-content-v3";
const PHOTOS_CACHE = "vadem-photos-v3";

// Key used to persist the current manualVersion inside CONTENT_CACHE
const VERSION_META_KEY = "__manual_version__";

// Static assets to pre-cache on install (app shell)
const APP_SHELL_URLS = ["/", "/manifest.json"];

// All known caches managed by this SW — any other cache names are purged on activate
const KNOWN_CACHES = new Set([APP_SHELL_CACHE, CONTENT_CACHE, PHOTOS_CACHE]);

// ── Install ───────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_URLS)),
  );
  // Don't skipWaiting here — the app will post SKIP_WAITING when the user
  // taps the "Update available" banner, giving them a chance to save state.
});

// ── Activate ──────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => !KNOWN_CACHES.has(name))
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  self.clients.claim();
});

// ── Update handshake ──────────────────────────────────────────────────────
// The app posts { type: 'SKIP_WAITING' } when the user taps the update banner.
// This activates the new SW immediately; the client then reloads.

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── URL classifiers ───────────────────────────────────────────────────────

/** True for Next.js static asset URLs that should be cached forever. */
function isAppShellUrl(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.json" ||
    url.pathname.startsWith("/icons/")
  );
}

/** True for Convex storage image URLs (non-video). */
function isConvexPhoto(url, request) {
  if (!url.hostname.endsWith(".convex.cloud")) return false;
  if (!url.pathname.startsWith("/api/storage/")) return false;
  // Exclude video — handled separately below
  if (request.destination === "video") return false;
  const accept = request.headers.get("accept") ?? "";
  if (accept.startsWith("video/")) return false;
  return true;
}

/** True for Convex storage video URLs. */
function isConvexVideo(url, request) {
  if (!url.hostname.endsWith(".convex.cloud")) return false;
  if (!url.pathname.startsWith("/api/storage/")) return false;
  return (
    request.destination === "video" ||
    (request.headers.get("accept") ?? "").startsWith("video/")
  );
}

// ── Fetch handler ─────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never intercept OAuth callbacks — must hit the server directly
  if (url.pathname.startsWith("/auth/callback")) return;

  // Never intercept email verification — token is one-time-use, must always hit the server
  if (url.pathname.startsWith("/verify-email")) return;

  // ── Vault: never cache vault-related requests — security-critical ─────
  // Convex actions (POST) are already excluded by the method check above.
  // This guard handles any GET requests whose URL mentions vault endpoints,
  // ensuring no vault data ever lands in Cache Storage.
  const hrefLower = event.request.url.toLowerCase();
  if (hrefLower.includes("vault") || hrefLower.includes("getdecryptedvaultitems")) {
    return; // Pass through to network without caching
  }

  // ── (1) App shell: cache-first for Next.js static assets ──────────────
  if (isAppShellUrl(url)) {
    event.respondWith(
      caches.open(APP_SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      }),
    );
    return;
  }

  // ── (2) Photo cache: cache-first for Convex storage images ────────────
  if (isConvexPhoto(url, event.request)) {
    event.respondWith(
      caches.open(PHOTOS_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          // Truly offline and not cached — return 504
          return new Response(null, { status: 504 });
        }
      }),
    );
    return;
  }

  // ── (3) Video: cache only when explicitly fetched by <video> element ──
  // Videos are NOT pre-cached due to size. We cache the response the first
  // time the sitter presses play so subsequent plays work offline.
  if (isConvexVideo(url, event.request)) {
    event.respondWith(
      caches.open(PHOTOS_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          // Only cache complete responses (status 200), not partial (206)
          if (response.ok && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          return new Response(null, { status: 504 });
        }
      }),
    );
    return;
  }

  // ── (4) Content / navigation: network-first with cache fallback ────────
  // Catches page navigations and any other GET requests (e.g. Next.js page
  // JSON, font files, etc.). Convex WebSocket traffic is NOT a fetch request
  // and therefore not intercepted here.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful HTML/JSON responses for offline fallback.
        // Clone BEFORE the body is consumed by the browser.
        if (
          response.ok &&
          (response.headers.get("content-type") ?? "").match(
            /text\/html|application\/json/,
          )
        ) {
          const cloned = response.clone();
          caches
            .open(CONTENT_CACHE)
            .then((cache) => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(
          (cached) =>
            cached ??
            new Response(
              '{"error":"offline"}',
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              },
            ),
        ),
      ),
  );
});

// ── Message handler: version-based cache invalidation ────────────────────
//
// The sitter page posts { type: 'MANUAL_VERSION_CHECK', propertyId, version }
// when it receives Convex data. If the version has changed since the last
// visit the SW clears the photo and content caches so stale images are
// re-fetched on the next load.

self.addEventListener("message", (event) => {
  if (!event.data) return;

  const { type, propertyId, version } = event.data;

  if (type === "MANUAL_VERSION_CHECK" && propertyId && version !== undefined) {
    event.waitUntil(handleVersionCheck(propertyId, version));
  }

  if (type === "CACHE_TRIP_DATA" && event.data.key && event.data.payload) {
    // Page is asking the SW to persist arbitrary trip data for offline use.
    // We store it as a synthetic Response inside CONTENT_CACHE keyed by a
    // fake URL so it survives browser restarts.
    event.waitUntil(
      caches.open(CONTENT_CACHE).then((cache) => {
        const blob = new Blob(
          [JSON.stringify(event.data.payload)],
          { type: "application/json" },
        );
        const response = new Response(blob, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        return cache.put(
          new Request(`/__offline_data__/${event.data.key}`),
          response,
        );
      }),
    );
  }

  if (type === "GET_TRIP_DATA" && event.data.key) {
    event.waitUntil(
      caches.open(CONTENT_CACHE).then(async (cache) => {
        const cached = await cache.match(
          new Request(`/__offline_data__/${event.data.key}`),
        );
        let payload = null;
        if (cached) {
          try {
            payload = await cached.json();
          } catch {
            payload = null;
          }
        }
        // Reply to the client that sent the message
        if (event.source) {
          event.source.postMessage({
            type: "TRIP_DATA_RESPONSE",
            key: event.data.key,
            payload,
          });
        }
      }),
    );
  }
});

async function handleVersionCheck(propertyId, version) {
  const cache = await caches.open(CONTENT_CACHE);
  const versionKey = `${VERSION_META_KEY}${propertyId}`;
  const versionRequest = new Request(`/__version__/${propertyId}`);

  const cached = await cache.match(versionRequest);
  let storedVersion = null;
  if (cached) {
    try {
      const data = await cached.json();
      storedVersion = data.version ?? null;
    } catch {
      storedVersion = null;
    }
  }

  if (storedVersion !== null && storedVersion !== version) {
    // Version changed — evict stale photo and content caches
    await Promise.all([
      caches.delete(PHOTOS_CACHE),
      // Re-open fresh empty photos cache immediately
      caches.open(PHOTOS_CACHE),
    ]);
    // Clear cached trip data for this property
    const contentCache = await caches.open(CONTENT_CACHE);
    const keys = await contentCache.keys();
    await Promise.all(
      keys
        .filter((req) => req.url.includes(`/__offline_data__/`))
        .map((req) => contentCache.delete(req)),
    );
  }

  // Store new version — create a synthetic response
  const versionBlob = new Blob(
    [JSON.stringify({ version, updatedAt: Date.now() })],
    { type: "application/json" },
  );
  await cache.put(
    versionRequest,
    new Response(versionBlob, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  void versionKey; // suppress unused variable warning
}

// ── Web Push ──────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Vadem", body: event.data.text(), url: "/" };
  }

  const title = data.title ?? "Vadem";
  const options = {
    body: data.body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    data: { url: data.url ?? "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
