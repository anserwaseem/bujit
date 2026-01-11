import { describe, it, expect } from "vitest";
import {
  evaluateMathExpression,
  hasOperators,
  formatEvaluatedAmount,
} from "../mathEval";

describe("mathEval", () => {
  describe("evaluateMathExpression", () => {
    it("should evaluate simple addition", () => {
      expect(evaluateMathExpression("100+50")).toBe(150);
      expect(evaluateMathExpression("1+2+3")).toBe(6);
    });

    it("should evaluate simple subtraction", () => {
      expect(evaluateMathExpression("100-30")).toBe(70);
      expect(evaluateMathExpression("200-50-25")).toBe(125);
    });

    it("should evaluate multiplication", () => {
      expect(evaluateMathExpression("10*5")).toBe(50);
      expect(evaluateMathExpression("3*4*2")).toBe(24);
    });

    it("should evaluate division", () => {
      expect(evaluateMathExpression("100/4")).toBe(25);
      expect(evaluateMathExpression("1000/10/2")).toBe(50);
    });

    it("should evaluate mixed operations", () => {
      expect(evaluateMathExpression("100+50*2")).toBe(200);
      expect(evaluateMathExpression("100-20+30")).toBe(110);
      expect(evaluateMathExpression("50*2+100/4")).toBe(125);
    });

    it("should handle parentheses", () => {
      expect(evaluateMathExpression("(100+50)*2")).toBe(300);
      expect(evaluateMathExpression("100/(2+3)")).toBe(20);
    });

    it("should handle decimal numbers", () => {
      expect(evaluateMathExpression("10.5+20.5")).toBe(31);
      expect(evaluateMathExpression("100/3")).toBeCloseTo(33.33, 2);
    });

    it("should handle spaces", () => {
      expect(evaluateMathExpression("100 + 50")).toBe(150);
      expect(evaluateMathExpression(" 200 - 100 ")).toBe(100);
    });

    it("should round to 2 decimal places", () => {
      expect(evaluateMathExpression("100/3")).toBe(33.33);
      expect(evaluateMathExpression("10/6")).toBe(1.67);
    });

    // Invalid inputs
    it("should return null for empty string", () => {
      expect(evaluateMathExpression("")).toBeNull();
      expect(evaluateMathExpression("   ")).toBeNull();
    });

    it("should return null for non-numeric characters", () => {
      expect(evaluateMathExpression("abc")).toBeNull();
      expect(evaluateMathExpression("100+abc")).toBeNull();
      expect(evaluateMathExpression("alert(1)")).toBeNull();
    });

    it("should return null for expressions exceeding max length", () => {
      const longExpr = "1+".repeat(30) + "1";
      expect(evaluateMathExpression(longExpr)).toBeNull();
    });

    it("should return null for empty parentheses", () => {
      expect(evaluateMathExpression("100+()")).toBeNull();
      expect(evaluateMathExpression("( )")).toBeNull();
    });

    it("should return null for consecutive operators", () => {
      expect(evaluateMathExpression("100++50")).toBeNull();
      expect(evaluateMathExpression("100**2")).toBeNull();
    });

    it("should return null for division by zero", () => {
      expect(evaluateMathExpression("100/0")).toBeNull();
    });

    // Negative result validation
    it("should return null for negative results", () => {
      expect(evaluateMathExpression("50-100")).toBeNull();
      expect(evaluateMathExpression("10-20-30")).toBeNull();
    });

    it("should return null for zero result", () => {
      expect(evaluateMathExpression("100-100")).toBeNull();
      expect(evaluateMathExpression("0")).toBeNull();
    });

    it("should return null for negative input numbers", () => {
      // The regex allows minus, but negative numbers alone should fail (result <= 0)
      expect(evaluateMathExpression("-100")).toBeNull();
    });
  });

  describe("hasOperators", () => {
    it("should return true when expression has operators", () => {
      expect(hasOperators("100+50")).toBe(true);
      expect(hasOperators("100-50")).toBe(true);
      expect(hasOperators("100*50")).toBe(true);
      expect(hasOperators("100/50")).toBe(true);
    });

    it("should return false when no operators", () => {
      expect(hasOperators("100")).toBe(false);
      expect(hasOperators("12345")).toBe(false);
      expect(hasOperators("")).toBe(false);
    });

    it("should handle spaces", () => {
      expect(hasOperators("  100 + 50  ")).toBe(true);
      expect(hasOperators("  100  ")).toBe(false);
    });
  });

  describe("formatEvaluatedAmount", () => {
    it("should format with currency symbol", () => {
      expect(formatEvaluatedAmount(100, "₹")).toBe("₹100");
      expect(formatEvaluatedAmount(1000, "$")).toBe("$1,000");
    });

    it("should format large amounts with Indian number format", () => {
      expect(formatEvaluatedAmount(100000, "₹")).toBe("₹1,00,000");
      expect(formatEvaluatedAmount(1234567, "₹")).toBe("₹12,34,567");
    });

    it("should format decimal amounts", () => {
      expect(formatEvaluatedAmount(100.5, "₹")).toBe("₹100.5");
      expect(formatEvaluatedAmount(100.99, "₹")).toBe("₹100.99");
    });

    it("should not show unnecessary decimal places", () => {
      expect(formatEvaluatedAmount(100, "₹")).toBe("₹100");
      expect(formatEvaluatedAmount(100.0, "₹")).toBe("₹100");
    });
  });
});
