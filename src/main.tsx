import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { setServiceWorkerRegistration } from "./lib/pwa";

// render app immediately without waiting for service worker
createRoot(document.getElementById("root")!).render(<App />);

// register service worker asynchronously after app renders
// this prevents blocking the initial render when online
if ("serviceWorker" in navigator) {
  // register service worker after app renders using requestIdleCallback
  // falls back to setTimeout if requestIdleCallback is not available
  // KEY FIX: immediate: false prevents blocking on update checks when online
  const registerServiceWorker = () => {
    registerSW({
      immediate: false, // don't block on update checks - critical for online performance
      onRegisteredSW(swUrl, registration) {
        if (registration) {
          setServiceWorkerRegistration(registration);
          // check for updates every 5 minutes (deferred to not block initial load)
          // delay first update check to ensure app is fully loaded
          setTimeout(() => {
            setInterval(
              () => {
                registration.update();
              },
              5 * 60 * 1000
            );
            // perform initial update check after app has loaded
            registration.update();
          }, 3000); // wait 3 seconds after app loads before first update check
        }
      },
      // handle existing registration without blocking
      onRegistered(registration) {
        if (registration) {
          setServiceWorkerRegistration(registration);
        }
      },
    });
  };

  // use longer delay when online to ensure app renders first
  // when offline, this will still be fast because SW is already cached
  if ("requestIdleCallback" in window) {
    requestIdleCallback(registerServiceWorker, { timeout: 3000 });
  } else {
    // fallback: delay registration slightly to ensure app renders first
    setTimeout(registerServiceWorker, 100);
  }
}
