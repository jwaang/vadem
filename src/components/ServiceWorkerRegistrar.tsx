"use client";

import { useEffect, useState } from "react";

export function ServiceWorkerRegistrar() {
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      // New SW found while page is open
      const onUpdateFound = () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          // SW installed and waiting — a previous SW is still controlling the page
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingSW(newWorker);
          }
        });
      };

      registration.addEventListener("updatefound", onUpdateFound);

      // If a SW was already waiting when the page loaded (e.g. user had another tab open)
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaitingSW(registration.waiting);
      }
    }).catch(() => {
      // Registration failed — non-critical
    });

    // When the SW changes (after skipWaiting), reload to get fresh assets
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!reloading) {
        setReloading(true);
        window.location.reload();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleUpdate() {
    if (!waitingSW) return;
    waitingSW.postMessage({ type: "SKIP_WAITING" });
  }

  if (!waitingSW) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] flex items-center justify-between gap-4 bg-text-primary text-white px-5 py-3 font-body text-sm">
      <span>A new version of Vadem is available.</span>
      <button
        onClick={handleUpdate}
        className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
      >
        Refresh now
      </button>
    </div>
  );
}
