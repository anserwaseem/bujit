import { describe, it, expect } from "vitest";
import {
  maskAmount,
  maskReason,
  formatMaskedAmount,
  isPrivacyModeEnabled,
} from "../privacy";
import { AppSettings } from "../types";

describe("Privacy Mode", () => {
  const defaultSettings: AppSettings = {
    currency: "PKR",
    currencySymbol: "Rs.",
  };

  const privacySettings: AppSettings = {
    currency: "PKR",
    currencySymbol: "Rs.",
    privacyMode: {
      hideAmounts: true,
      hideReasons: false,
    },
  };

  const fullPrivacySettings: AppSettings = {
    currency: "PKR",
    currencySymbol: "Rs.",
    privacyMode: {
      hideAmounts: true,
      hideReasons: true,
    },
  };

  describe("maskAmount", () => {
    it("should return original amount when privacy mode is disabled", () => {
      expect(maskAmount(100, defaultSettings)).toBe("100");
      expect(maskAmount("500", defaultSettings)).toBe("500");
    });

    it("should mask amount when hideAmounts is enabled", () => {
      expect(maskAmount(100, privacySettings)).toBe("••••");
      expect(maskAmount("500", privacySettings)).toBe("••••");
    });
  });

  describe("maskReason", () => {
    it("should return original reason when privacy mode is disabled", () => {
      expect(maskReason("Coffee", defaultSettings)).toBe("Coffee");
      expect(maskReason("Grocery Shopping", defaultSettings)).toBe(
        "Grocery Shopping"
      );
    });

    it("should return original reason when only hideAmounts is enabled", () => {
      expect(maskReason("Coffee", privacySettings)).toBe("Coffee");
    });

    it("should mask reason when hideReasons is enabled", () => {
      expect(maskReason("Coffee", fullPrivacySettings)).toBe("••••••");
      expect(maskReason("Grocery Shopping", fullPrivacySettings)).toBe(
        "••••••"
      );
    });
  });

  describe("formatMaskedAmount", () => {
    it("should format amount normally when privacy mode is disabled", () => {
      expect(formatMaskedAmount(100, defaultSettings, "Rs.")).toBe("Rs.100");
      expect(formatMaskedAmount(1500.5, defaultSettings, "Rs.")).toBe(
        "Rs.1,500.5"
      );
    });

    it("should mask amount when hideAmounts is enabled", () => {
      expect(formatMaskedAmount(100, privacySettings, "Rs.")).toBe("Rs.••••");
      expect(formatMaskedAmount(1500.5, privacySettings, "Rs.")).toBe(
        "Rs.••••"
      );
    });
  });

  describe("isPrivacyModeEnabled", () => {
    it("should return false when privacy mode is not set", () => {
      expect(isPrivacyModeEnabled(defaultSettings)).toBe(false);
    });

    it("should return false when both options are false", () => {
      const settings: AppSettings = {
        currency: "PKR",
        currencySymbol: "Rs.",
        privacyMode: {
          hideAmounts: false,
          hideReasons: false,
        },
      };
      expect(isPrivacyModeEnabled(settings)).toBe(false);
    });

    it("should return true when hideAmounts is enabled", () => {
      expect(isPrivacyModeEnabled(privacySettings)).toBe(true);
    });

    it("should return true when hideReasons is enabled", () => {
      const settings: AppSettings = {
        currency: "PKR",
        currencySymbol: "Rs.",
        privacyMode: {
          hideAmounts: false,
          hideReasons: true,
        },
      };
      expect(isPrivacyModeEnabled(settings)).toBe(true);
    });

    it("should return true when both are enabled", () => {
      expect(isPrivacyModeEnabled(fullPrivacySettings)).toBe(true);
    });
  });
});
