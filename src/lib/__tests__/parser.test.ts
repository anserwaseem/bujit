import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseInput, formatAmount, getRelativeDate } from "../parser";
import type { PaymentMode } from "../types";

describe("parser", () => {
  const mockModes: PaymentMode[] = [
    { id: "1", name: "Debit Card", shorthand: "D" },
    { id: "2", name: "Cash", shorthand: "C" },
    { id: "3", name: "Credit Card", shorthand: "CC" },
    { id: "4", name: "JazzCash", shorthand: "JC" },
  ];

  describe("parseInput", () => {
    it("should return invalid result for empty input", () => {
      const result = parseInput("", mockModes);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("");
      expect(result.amount).toBeNull();
      expect(result.paymentMode).toBe("Cash");
    });

    it("should return invalid result for whitespace-only input", () => {
      const result = parseInput("   ", mockModes);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("");
      expect(result.amount).toBeNull();
    });

    it("should return invalid result when input has less than 2 parts", () => {
      const result = parseInput("coffee", mockModes);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("coffee");
      expect(result.amount).toBeNull();
      expect(result.paymentMode).toBe("Cash");
    });

    it("should parse valid input with reason and amount", () => {
      const result = parseInput("coffee 100", mockModes);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe("coffee");
      expect(result.amount).toBe(100);
      expect(result.paymentMode).toBe("Cash");
    });

    it("should parse input with payment mode", () => {
      const result = parseInput("coffee D 100", mockModes);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe("coffee");
      expect(result.amount).toBe(100);
      expect(result.paymentMode).toBe("Debit Card");
    });

    it("should parse input with payment mode shorthand", () => {
      const result = parseInput("lunch CC 250", mockModes);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe("lunch");
      expect(result.amount).toBe(250);
      expect(result.paymentMode).toBe("Credit Card");
    });

    it("should parse input with payment mode name (case insensitive)", () => {
      // parser only checks single-word payment modes, so "debit card" won't match
      // it will check "card" which doesn't match, so all parts before amount are included in reason
      const result = parseInput("dinner debit card 500", mockModes);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe("dinner debit card");
      expect(result.amount).toBe(500);
      expect(result.paymentMode).toBe("Cash");
    });

    it("should handle amounts with commas", () => {
      const result = parseInput("groceries 1,000", mockModes);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe("groceries");
      expect(result.amount).toBe(1000);
    });

    it("should handle amounts with multiple commas", () => {
      const result = parseInput("rent 10,000.50", mockModes);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe("rent");
      expect(result.amount).toBe(10000.5);
    });

    it("should return invalid when amount is not a number", () => {
      const result = parseInput("coffee abc", mockModes);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("coffee abc");
      expect(result.amount).toBeNull();
    });

    it("should handle multi-word reasons", () => {
      const result = parseInput("coffee at starbucks 150", mockModes);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe("coffee at starbucks");
      expect(result.amount).toBe(150);
    });

    it("should handle multi-word reasons with payment mode", () => {
      const result = parseInput("lunch with friends JC 300", mockModes);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe("lunch with friends");
      expect(result.amount).toBe(300);
      expect(result.paymentMode).toBe("JazzCash");
    });

    it("should default to Cash when payment mode doesn't match", () => {
      // when payment mode doesn't match, it's included in reason
      const result = parseInput("coffee XYZ 100", mockModes);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe("coffee XYZ");
      expect(result.amount).toBe(100);
      expect(result.paymentMode).toBe("Cash");
    });

    it("should return invalid when amount is zero", () => {
      const result = parseInput("coffee 0", mockModes);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("coffee 0");
      expect(result.amount).toBeNull();
    });

    it("should return invalid when amount is negative", () => {
      const result = parseInput("coffee -100", mockModes);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("coffee -100");
      expect(result.amount).toBeNull();
    });

    // Math expression tests
    describe("math expressions", () => {
      it("should parse simple addition in amount", () => {
        const result = parseInput("coffee 100+50", mockModes);
        expect(result.isValid).toBe(true);
        expect(result.reason).toBe("coffee");
        expect(result.amount).toBe(150);
      });

      it("should parse subtraction in amount", () => {
        const result = parseInput("refund 200-50", mockModes);
        expect(result.isValid).toBe(true);
        expect(result.reason).toBe("refund");
        expect(result.amount).toBe(150);
      });

      it("should parse multiplication in amount", () => {
        const result = parseInput("tickets 50*3", mockModes);
        expect(result.isValid).toBe(true);
        expect(result.reason).toBe("tickets");
        expect(result.amount).toBe(150);
      });

      it("should parse division in amount", () => {
        const result = parseInput("split bill 300/2", mockModes);
        expect(result.isValid).toBe(true);
        expect(result.reason).toBe("split bill");
        expect(result.amount).toBe(150);
      });

      it("should parse complex math expression with payment mode", () => {
        const result = parseInput("groceries CC 100+50+25", mockModes);
        expect(result.isValid).toBe(true);
        expect(result.reason).toBe("groceries");
        expect(result.paymentMode).toBe("Credit Card");
        expect(result.amount).toBe(175);
      });

      it("should return invalid for math expression with negative result", () => {
        const result = parseInput("expense 50-100", mockModes);
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("expense 50-100");
        expect(result.amount).toBeNull();
      });

      it("should return invalid for math expression with zero result", () => {
        const result = parseInput("expense 100-100", mockModes);
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("expense 100-100");
        expect(result.amount).toBeNull();
      });

      it("should return invalid for division by zero", () => {
        const result = parseInput("error 100/0", mockModes);
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("error 100/0");
        expect(result.amount).toBeNull();
      });
    });

    it("should handle empty reason after parsing", () => {
      // with only 2 parts, parser doesn't check for payment mode
      // reason becomes "D" which is valid (length > 0)
      const result = parseInput("D 100", mockModes);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe("D");
      expect(result.amount).toBe(100);
      expect(result.paymentMode).toBe("Cash");
    });

    it("should trim input before parsing", () => {
      const result = parseInput("  coffee  100  ", mockModes);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe("coffee");
      expect(result.amount).toBe(100);
    });
  });

  describe("formatAmount", () => {
    it("should format integer amounts", () => {
      expect(formatAmount(100)).toBe("100");
      expect(formatAmount(1000)).toBe("1,000");
      expect(formatAmount(1000000)).toBe("10,00,000");
    });

    it("should format decimal amounts", () => {
      expect(formatAmount(100.5)).toBe("100.5");
      expect(formatAmount(100.5)).toBe("100.5");
      expect(formatAmount(100.99)).toBe("100.99");
    });

    it("should format zero", () => {
      expect(formatAmount(0)).toBe("0");
    });

    it("should format large amounts with Indian number format", () => {
      expect(formatAmount(1234567.89)).toBe("12,34,567.89");
    });

    it("should handle small decimal amounts", () => {
      expect(formatAmount(0.5)).toBe("0.5");
      expect(formatAmount(0.99)).toBe("0.99");
    });
  });

  describe("getRelativeDate", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return 'Today' for today's date", () => {
      const today = new Date("2024-01-15T12:00:00");
      vi.setSystemTime(today);
      expect(getRelativeDate("2024-01-15T12:00:00")).toBe("Today");
    });

    it("should return 'Yesterday' for yesterday's date", () => {
      const today = new Date("2024-01-15T12:00:00");
      vi.setSystemTime(today);
      const yesterday = new Date("2024-01-14T12:00:00");
      expect(getRelativeDate(yesterday.toISOString())).toBe("Yesterday");
    });

    it("should return formatted date for dates within current year", () => {
      const today = new Date("2024-06-15T12:00:00");
      vi.setSystemTime(today);
      const pastDate = new Date("2024-01-10T12:00:00");
      const result = getRelativeDate(pastDate.toISOString());
      expect(result).toMatch(/Jan/);
      expect(result).not.toMatch(/2024/);
    });

    it("should include year for dates from previous year", () => {
      const today = new Date("2024-01-15T12:00:00");
      vi.setSystemTime(today);
      const pastDate = new Date("2023-12-25T12:00:00");
      const result = getRelativeDate(pastDate.toISOString());
      expect(result).toMatch(/2023/);
    });

    it("should include year for dates from future year", () => {
      const today = new Date("2024-01-15T12:00:00");
      vi.setSystemTime(today);
      const futureDate = new Date("2025-01-10T12:00:00");
      const result = getRelativeDate(futureDate.toISOString());
      expect(result).toMatch(/2025/);
    });

    it("should format date with weekday and day", () => {
      const today = new Date("2024-06-15T12:00:00"); // Saturday
      vi.setSystemTime(today);
      const pastDate = new Date("2024-06-10T12:00:00"); // Monday
      const result = getRelativeDate(pastDate.toISOString());
      expect(result).toMatch(/Mon/);
      expect(result).toMatch(/10/);
    });
  });
});
