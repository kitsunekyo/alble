"use client";

import { useEffect } from "react";

const RELOAD_KEY = "dev-service-worker-cleanup-reloaded";

/**
 * The service worker must not stay active in development: it keeps serving
 * precached chunks and RSC payloads from earlier sessions, so clicking a link
 * hangs on assets the current dev server no longer has. `SerwistProvider` with
 * `disable` only skips *new* registrations, so anything a previous session left
 * behind is torn down here (one reload, otherwise the stale worker keeps
 * controlling the page until it is reloaded).
 */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length === 0) return;

        await Promise.all(registrations.map((registration) => registration.unregister()));

        if (typeof caches !== "undefined") {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        }

        if (navigator.serviceWorker.controller && !sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, "1");
          location.reload();
        }
      } catch {
        // Best effort: never break the dev page over a cleanup attempt.
      }
    })();
  }, []);

  return null;
}
