// PWA utilities for managing service worker updates
// Following best practices from https://web.dev/articles/service-worker-lifecycle

let swRegistration: ServiceWorkerRegistration | null = null;

export function setServiceWorkerRegistration(
  registration: ServiceWorkerRegistration
) {
  swRegistration = registration;
}

/**
 * Safe update mechanism that preserves localStorage data.
 * Uses proper service worker lifecycle: SKIP_WAITING + controllerchange event.
 */
export async function safeUpdate(): Promise<void> {
  // Set up controller change listener BEFORE triggering update
  let reloadScheduled = false;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Only reload once after we've triggered the update
      if (reloadScheduled) {
        window.location.reload();
      }
    });
  }

  // If there's already a waiting worker, activate it
  if (swRegistration?.waiting) {
    reloadScheduled = true;
    swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    // Fallback reload after 1 second if controllerchange doesn't fire
    setTimeout(() => window.location.reload(), 1000);
    return;
  }

  // Try to check for updates
  if (swRegistration) {
    try {
      await swRegistration.update();
      // Check if we now have a waiting worker
      if (swRegistration.waiting) {
        reloadScheduled = true;
        swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
        setTimeout(() => window.location.reload(), 1000);
        return;
      }
    } catch {
      // Update check failed, proceed to hard refresh
    }
  }

  // No waiting worker available, do a cache-busting hard refresh
  // This bypasses the browser cache without destroying localStorage
  window.location.href =
    window.location.href.split("?")[0] + "?refresh=" + Date.now();
}
