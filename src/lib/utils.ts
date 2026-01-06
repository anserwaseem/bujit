import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Haptic feedback utility for mobile devices
// Supports both Android (vibrate API) and iOS Safari (checkbox switch workaround)
// iOS Safari requires haptics to be triggered synchronously within user gesture context
// Requires Safari 17.4+ for iOS haptic feedback support

// Check if we're on iOS
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function haptic(
  type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light"
) {
  // Try Android vibrate API first
  if (navigator.vibrate) {
    const patterns: Record<string, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 20],
      warning: [20, 30, 20],
      error: [30, 50, 30, 50, 30],
    };

    navigator.vibrate(patterns[type]);
    return;
  }

  // iOS Safari workaround: use checkbox switch for haptic feedback
  // This works on iOS Safari 17.4+ by creating and toggling a switch input
  // Must be done synchronously within user gesture context (no setTimeout/async)
  if (!isIOS() || typeof document === "undefined") {
    return;
  }

  try {
    // Create a new checkbox element each time (as ios-haptics library does)
    // This ensures it's fresh and in the proper state
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.setAttribute("role", "switch");

    // Style it to be invisible but in viewport and clickable
    // iOS requires element to be in viewport and clickable for haptics
    checkbox.style.position = "fixed";
    checkbox.style.width = "51px";
    checkbox.style.height = "31px";
    checkbox.style.left = "0";
    checkbox.style.top = "0";
    checkbox.style.opacity = "0.01"; // Very low but not 0 - iOS needs it "visible"
    checkbox.style.pointerEvents = "auto"; // CRITICAL: must be clickable!
    checkbox.style.zIndex = "9999";
    checkbox.style.margin = "0";
    checkbox.style.padding = "0";
    checkbox.style.border = "0";
    checkbox.style.outline = "none";
    // Ensure it uses iOS switch appearance
    checkbox.style.appearance = "none";
    checkbox.style.webkitAppearance = "none";

    // Append to body synchronously
    document.body.appendChild(checkbox);

    // Force a reflow to ensure element is in DOM
    void checkbox.offsetHeight;

    // Determine number of toggles for different haptic patterns
    const toggleCount =
      type === "error" ? 3 : type === "warning" || type === "success" ? 2 : 1;

    // Toggle synchronously - this is critical for iOS
    // iOS Safari only triggers haptics if the toggle happens within the user gesture
    for (let i = 0; i < toggleCount; i++) {
      // Toggle the checked state - this is what triggers the haptic
      checkbox.checked = !checkbox.checked;

      // Click it - iOS needs the actual click event
      checkbox.click();

      // Force a synchronous reflow to ensure the toggle is processed
      if (i < toggleCount - 1) {
        void checkbox.offsetHeight;
      }
    }

    // Remove element after a short delay (but this is async, so it won't break gesture)
    // The element is invisible so leaving it briefly is fine
    setTimeout(() => {
      try {
        if (checkbox.parentNode) {
          checkbox.parentNode.removeChild(checkbox);
        }
      } catch {
        // ignore cleanup errors
      }
    }, 100);
  } catch {
    // silently fail if haptic feedback fails
  }
}
