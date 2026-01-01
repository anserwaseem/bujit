// PWA utilities for managing service worker updates
// Following best practices from https://web.dev/articles/service-worker-lifecycle

let swRegistration: ServiceWorkerRegistration | null = null;

export function setServiceWorkerRegistration(registration: ServiceWorkerRegistration) {
  swRegistration = registration;
}

export function getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  return swRegistration;
}

export async function checkForUpdates(): Promise<boolean> {
  if (!swRegistration) {
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.getRegistration();
      } catch {
        return false;
      }
    }
  }

  if (swRegistration) {
    try {
      await swRegistration.update();
      return swRegistration.waiting !== null;
    } catch {
      return false;
    }
  }
  return false;
}

export function applyUpdate(): void {
  if (swRegistration?.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  } else {
    window.location.reload();
  }
}

/**
 * Safe update mechanism that preserves localStorage data.
 * Uses proper service worker lifecycle: SKIP_WAITING + controllerchange event.
 */
export async function safeUpdate(): Promise<void> {
  // Set up controller change listener BEFORE triggering update
  let reloadScheduled = false;
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Only reload once after we've triggered the update
      if (reloadScheduled) {
        window.location.reload();
      }
    });
  }

  // If there's already a waiting worker, activate it
  if (swRegistration?.waiting) {
    reloadScheduled = true;
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
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
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(() => window.location.reload(), 1000);
        return;
      }
    } catch {
      // Update check failed, proceed to hard refresh
    }
  }

  // No waiting worker available, do a cache-busting hard refresh
  // This bypasses the browser cache without destroying localStorage
  window.location.href = window.location.href.split('?')[0] + '?refresh=' + Date.now();
}

/**
 * Nuclear option - only use when app is completely broken.
 * Clears all caches and unregisters service workers.
 * WARNING: May cause issues on iOS PWAs.
 */
export async function hardReset(): Promise<void> {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
  }

  window.location.reload();
}
