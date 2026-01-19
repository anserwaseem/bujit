import { AppSettings } from "./types";

/**
 * Mask sensitive data based on privacy settings.
 * Used when showing the app to others or sharing screenshots.
 */
export function maskAmount(
  amount: number | string,
  settings: AppSettings
): string {
  if (!settings.privacyMode?.hideAmounts) {
    return typeof amount === "number" ? amount.toString() : amount;
  }
  return "••••";
}

export function maskReason(reason: string, settings: AppSettings): string {
  if (!settings.privacyMode?.hideReasons) {
    return reason;
  }
  return "••••••";
}

export function formatMaskedAmount(
  amount: number,
  settings: AppSettings,
  currencySymbol: string
): string {
  if (!settings.privacyMode?.hideAmounts) {
    return `${currencySymbol}${amount.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })}`;
  }
  return `${currencySymbol}••••`;
}

export function isPrivacyModeEnabled(settings: AppSettings): boolean {
  return (
    settings.privacyMode?.hideAmounts === true ||
    settings.privacyMode?.hideReasons === true
  );
}
