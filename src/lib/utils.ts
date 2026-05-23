import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { triggerHaptic } from "tactus";
import { TimePeriod } from "@/hooks/useFilters";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** UUID that works on HTTP (e.g. LAN dev URLs) where crypto.randomUUID may throw. */
export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // non-secure context (e.g. http://192.168.x.x)
    }
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Haptic feedback utility for mobile devices
// Uses Tactus library which provides reliable haptic feedback on iOS Safari/Chrome
// See: https://tactus.aadee.xyz/
// triggerHaptic(duration?) - duration in ms, defaults to 100ms

export function haptic(
  type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light"
) {
  try {
    // Map our haptic types to Tactus triggerHaptic calls
    // Different durations and patterns for different types
    switch (type) {
      case "light":
        triggerHaptic(50); // short, light haptic
        break;
      case "medium":
        triggerHaptic(100); // default duration
        break;
      case "heavy":
        triggerHaptic(150); // longer, stronger haptic
        break;
      case "success":
        // Success: two quick haptics
        triggerHaptic(50);
        setTimeout(() => triggerHaptic(50), 80);
        break;
      case "warning":
        // Warning: medium then light
        triggerHaptic(100);
        setTimeout(() => triggerHaptic(50), 100);
        break;
      case "error":
        // Error: three haptics (strong pattern)
        triggerHaptic(100);
        setTimeout(() => triggerHaptic(50), 100);
        setTimeout(() => triggerHaptic(100), 200);
        break;
      default:
        triggerHaptic(100);
    }
  } catch {
    // silently fail if haptic feedback fails
  }
}

// Get human-readable period text for dashboard labels
export function getPeriodText(timePeriod: TimePeriod): string {
  switch (timePeriod) {
    case "thisMonth":
      return "this month";
    case "lastMonth":
      return "last month";
    case "thisYear":
      return "this year";
    case "lastYear":
      return "last year";
    case "allTime":
      return "overall";
    case "custom":
      return "in period";
    default:
      return "this month";
  }
}
