import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLearnedNecessity } from "../useLearnedNecessity";
import type { Transaction } from "@/lib/types";

describe("useLearnedNecessity", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const createTransaction = (
    reason: string,
    necessity: "need" | "want" | null
  ): Transaction => ({
    id: "1",
    date: new Date().toISOString(),
    reason,
    amount: 100,
    paymentMode: "Cash",
    type: "expense",
    necessity,
  });

  describe("learnFromTransactions", () => {
    it("should learn from transactions with necessity", () => {
      const transactions: Transaction[] = [
        createTransaction("coffee", "need"),
        createTransaction("lunch", "want"),
        createTransaction("coffee", "need"),
      ];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      let learning: ReturnType<typeof result.current.learnFromTransactions>;
      act(() => {
        learning = result.current.learnFromTransactions();
      });

      expect(learning!["coffee"]).toBeDefined();
      expect(learning!["coffee"].need).toBe(2);
      expect(learning!["coffee"].want).toBe(0);
      expect(learning!["coffee"].lastUsed).toBe("need");
      expect(learning!["lunch"].need).toBe(0);
      expect(learning!["lunch"].want).toBe(1);
    });

    it("should ignore transactions without necessity", () => {
      const transactions: Transaction[] = [
        createTransaction("coffee", null),
        createTransaction("lunch", "need"),
      ];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      act(() => {
        result.current.learnFromTransactions();
      });

      const learning = result.current.learnFromTransactions();
      expect(learning["coffee"]).toBeUndefined();
      expect(learning["lunch"]).toBeDefined();
    });

    it("should ignore income transactions", () => {
      const transactions: Transaction[] = [
        {
          id: "1",
          date: new Date().toISOString(),
          reason: "salary",
          amount: 5000,
          paymentMode: "Cash",
          type: "income",
          necessity: null,
        },
      ];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      act(() => {
        result.current.learnFromTransactions();
      });

      const learning = result.current.learnFromTransactions();
      expect(Object.keys(learning)).toHaveLength(0);
    });

    it("should handle case-insensitive reasons", () => {
      const transactions: Transaction[] = [
        createTransaction("Coffee", "need"),
        createTransaction("COFFEE", "need"),
        createTransaction("coffee", "want"),
      ];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      let learning: ReturnType<typeof result.current.learnFromTransactions>;
      act(() => {
        learning = result.current.learnFromTransactions();
      });

      expect(learning!["coffee"]).toBeDefined();
      expect(learning!["coffee"].need).toBe(2);
      expect(learning!["coffee"].want).toBe(1);
    });

    it("should trim whitespace from reasons", () => {
      const transactions: Transaction[] = [
        createTransaction("  coffee  ", "need"),
        createTransaction("coffee", "need"),
      ];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      let learning: ReturnType<typeof result.current.learnFromTransactions>;
      act(() => {
        learning = result.current.learnFromTransactions();
      });

      expect(learning!["coffee"]).toBeDefined();
      expect(learning!["coffee"].need).toBe(2);
    });
  });

  describe("getSuggestedNecessity", () => {
    it("should return null when reason has no learning data", () => {
      const { result } = renderHook(() => useLearnedNecessity([]));

      expect(result.current.getSuggestedNecessity("unknown")).toBeNull();
    });

    it("should return lastUsed when total count is less than 2", () => {
      const transactions: Transaction[] = [createTransaction("coffee", "need")];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      act(() => {
        result.current.learnFromTransactions();
      });

      expect(result.current.getSuggestedNecessity("coffee")).toBe("need");
    });

    it("should suggest 'need' when need percentage is >= 70%", () => {
      const transactions: Transaction[] = [
        createTransaction("coffee", "need"),
        createTransaction("coffee", "need"),
        createTransaction("coffee", "need"),
        createTransaction("coffee", "want"),
      ];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      act(() => {
        result.current.learnFromTransactions();
      });

      expect(result.current.getSuggestedNecessity("coffee")).toBe("need");
    });

    it("should suggest 'want' when need percentage is <= 30%", () => {
      const transactions: Transaction[] = [
        createTransaction("coffee", "want"),
        createTransaction("coffee", "want"),
        createTransaction("coffee", "want"),
        createTransaction("coffee", "need"),
      ];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      act(() => {
        result.current.learnFromTransactions();
      });

      expect(result.current.getSuggestedNecessity("coffee")).toBe("want");
    });

    it("should return lastUsed when percentage is between 30% and 70%", () => {
      const transactions: Transaction[] = [
        createTransaction("coffee", "need"),
        createTransaction("coffee", "need"),
        createTransaction("coffee", "want"),
        createTransaction("coffee", "want"),
      ];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      act(() => {
        result.current.learnFromTransactions();
      });

      // lastUsed should be "want" (last transaction)
      expect(result.current.getSuggestedNecessity("coffee")).toBe("want");
    });

    it("should handle case-insensitive reason lookup", () => {
      const transactions: Transaction[] = [
        createTransaction("Coffee", "need"),
        createTransaction("Coffee", "need"),
      ];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      act(() => {
        result.current.learnFromTransactions();
      });

      expect(result.current.getSuggestedNecessity("COFFEE")).toBe("need");
      expect(result.current.getSuggestedNecessity("coffee")).toBe("need");
    });
  });

  describe("recordNecessity", () => {
    it("should record a new necessity choice", () => {
      const { result } = renderHook(() => useLearnedNecessity([]));

      act(() => {
        result.current.recordNecessity("coffee", "need");
      });

      expect(result.current.getSuggestedNecessity("coffee")).toBe("need");
      expect(result.current.isLearned("coffee")).toBe(false); // not enough data
    });

    it("should update existing learning data", () => {
      const transactions: Transaction[] = [
        createTransaction("coffee", "need"),
      ];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      act(() => {
        result.current.learnFromTransactions();
        result.current.recordNecessity("coffee", "want");
      });

      // get learning data without learning again
      const stored = localStorage.getItem("bujit_learned_necessity");
      const learning = stored ? JSON.parse(stored) : {};
      expect(learning["coffee"].need).toBe(1);
      expect(learning["coffee"].want).toBe(1);
      expect(learning["coffee"].lastUsed).toBe("want");
    });

    it("should not record when reason is empty", () => {
      const { result } = renderHook(() => useLearnedNecessity([]));

      act(() => {
        result.current.recordNecessity("", "need");
      });

      expect(result.current.getSuggestedNecessity("")).toBeNull();
    });

    it("should not record when necessity is null", () => {
      const { result } = renderHook(() => useLearnedNecessity([]));

      act(() => {
        result.current.recordNecessity("coffee", null);
      });

      expect(result.current.getSuggestedNecessity("coffee")).toBeNull();
    });

    it("should handle case-insensitive reason", () => {
      const { result } = renderHook(() => useLearnedNecessity([]));

      act(() => {
        result.current.recordNecessity("Coffee", "need");
        result.current.recordNecessity("COFFEE", "need");
      });

      expect(result.current.getSuggestedNecessity("coffee")).toBe("need");
    });
  });

  describe("isLearned", () => {
    it("should return false when reason has no learning data", () => {
      const { result } = renderHook(() => useLearnedNecessity([]));

      expect(result.current.isLearned("unknown")).toBe(false);
    });

    it("should return false when total count is less than 2", () => {
      const transactions: Transaction[] = [createTransaction("coffee", "need")];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      act(() => {
        result.current.learnFromTransactions();
      });

      expect(result.current.isLearned("coffee")).toBe(false);
    });

    it("should return true when total count is >= 2", () => {
      const transactions: Transaction[] = [
        createTransaction("coffee", "need"),
        createTransaction("coffee", "want"),
      ];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      act(() => {
        result.current.learnFromTransactions();
      });

      expect(result.current.isLearned("coffee")).toBe(true);
    });

    it("should handle case-insensitive reason lookup", () => {
      const transactions: Transaction[] = [
        createTransaction("Coffee", "need"),
        createTransaction("Coffee", "want"),
      ];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      act(() => {
        result.current.learnFromTransactions();
      });

      expect(result.current.isLearned("COFFEE")).toBe(true);
      expect(result.current.isLearned("coffee")).toBe(true);
    });
  });

  describe("persistence", () => {
    it("should persist learning data to localStorage", () => {
      const transactions: Transaction[] = [
        createTransaction("coffee", "need"),
        createTransaction("coffee", "need"),
      ];

      const { result } = renderHook(() => useLearnedNecessity(transactions));

      act(() => {
        result.current.learnFromTransactions();
      });

      const stored = localStorage.getItem("bujit_learned_necessity");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed["coffee"]).toBeDefined();
    });

    it("should load existing learning data from localStorage", () => {
      const existingData = {
        coffee: { need: 5, want: 2, lastUsed: "need" },
      };
      localStorage.setItem(
        "bujit_learned_necessity",
        JSON.stringify(existingData)
      );

      const { result } = renderHook(() => useLearnedNecessity([]));

      expect(result.current.getSuggestedNecessity("coffee")).toBe("need");
      expect(result.current.isLearned("coffee")).toBe(true);
    });
  });
});

