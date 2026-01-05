import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBudgly } from "../useBudgly";
import * as storage from "@/lib/storage";
import type { Transaction, PaymentMode, AppSettings } from "@/lib/types";

describe("useBudgly", () => {
  beforeEach(() => {
    // clear localStorage before each test
    localStorage.clear();
    // reset document class
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    // ensure localStorage is cleared
    localStorage.clear();
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("should initialize with empty transactions and default values", () => {
      const { result } = renderHook(() => useBudgly());

      expect(result.current.transactions).toEqual([]);
      expect(result.current.paymentModes.length).toBeGreaterThan(0);
      expect(result.current.theme).toBe("dark");
      expect(result.current.settings.currency).toBe("PKR");
      expect(result.current.settings.currencySymbol).toBe("Rs.");
      expect(result.current.timePeriod).toBe("thisMonth");
    });

    it("should load transactions from storage on mount", () => {
      const mockTransactions: Transaction[] = [
        {
          id: "1",
          date: "2024-01-15T00:00:00.000Z",
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];
      storage.addTransaction(mockTransactions[0]);

      const { result } = renderHook(() => useBudgly());

      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.transactions[0].id).toBe("1");
      expect(result.current.transactions[0].reason).toBe("coffee");
    });

    it("should load payment modes from storage on mount", () => {
      const customModes: PaymentMode[] = [
        { id: "1", name: "Custom Mode", shorthand: "CM" },
      ];
      storage.savePaymentModes(customModes);

      const { result } = renderHook(() => useBudgly());

      expect(result.current.paymentModes).toEqual(customModes);
    });

    it("should load settings from storage on mount", () => {
      const customSettings: AppSettings = {
        currency: "USD",
        currencySymbol: "$",
      };
      storage.saveSettings(customSettings);

      const { result } = renderHook(() => useBudgly());

      expect(result.current.settings).toEqual(customSettings);
    });

    it("should load theme from storage on mount", () => {
      storage.saveTheme("light");

      const { result } = renderHook(() => useBudgly());

      expect(result.current.theme).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should apply dark theme class on mount when theme is dark", () => {
      storage.saveTheme("dark");
      document.documentElement.classList.remove("dark");

      renderHook(() => useBudgly());

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should handle corrupted transaction data gracefully", () => {
      // set invalid data in localStorage
      localStorage.setItem("bujit_transactions", "invalid json");

      const { result } = renderHook(() => useBudgly());

      // should return empty array, not crash
      expect(result.current.transactions).toEqual([]);
      // storage should have been cleared
      expect(localStorage.getItem("bujit_transactions")).toBeNull();
    });

    it("should handle non-array transaction data gracefully", () => {
      localStorage.setItem(
        "bujit_transactions",
        JSON.stringify({ not: "array" })
      );

      const { result } = renderHook(() => useBudgly());

      expect(result.current.transactions).toEqual([]);
    });

    it("should filter out invalid transactions", () => {
      const invalidData = [
        { id: "1", amount: 100 }, // missing required fields
        {
          id: "2",
          date: "2024-01-15T00:00:00.000Z",
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        null,
        "invalid",
      ];
      localStorage.setItem("bujit_transactions", JSON.stringify(invalidData));

      const { result } = renderHook(() => useBudgly());

      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.transactions[0].id).toBe("2");
    });
  });

  describe("transaction operations", () => {
    it("should add a transaction and update state", () => {
      const { result } = renderHook(() => useBudgly());

      let newTransaction: Transaction;
      act(() => {
        newTransaction = result.current.addTransaction({
          date: "2024-01-15T00:00:00.000Z",
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        });
      });

      expect(newTransaction!.id).toBeDefined();
      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.transactions[0].reason).toBe("coffee");
      expect(result.current.transactions[0].amount).toBe(100);
      // verify it's actually saved to storage
      const saved = storage.getTransactions();
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe(newTransaction!.id);
    });

    it("should prepend new transaction to existing ones", () => {
      const existing: Transaction = {
        id: "existing-1",
        date: "2024-01-10T00:00:00.000Z",
        reason: "old coffee",
        amount: 50,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      };
      storage.addTransaction(existing);

      const { result } = renderHook(() => useBudgly());

      act(() => {
        result.current.addTransaction({
          date: "2024-01-15T00:00:00.000Z",
          reason: "new coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        });
      });

      expect(result.current.transactions).toHaveLength(2);
      // new transaction should be first
      expect(result.current.transactions[0].reason).toBe("new coffee");
      expect(result.current.transactions[1].reason).toBe("old coffee");
    });

    it("should delete a transaction and update state", () => {
      const transaction: Transaction = {
        id: "to-delete",
        date: "2024-01-15T00:00:00.000Z",
        reason: "coffee",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      };
      storage.addTransaction(transaction);

      const { result } = renderHook(() => useBudgly());

      act(() => {
        result.current.deleteTransaction("to-delete");
      });

      expect(result.current.transactions).toHaveLength(0);
      // verify it's actually deleted from storage
      const saved = storage.getTransactions();
      expect(saved).toHaveLength(0);
    });

    it("should handle deleting non-existent transaction gracefully", () => {
      const { result } = renderHook(() => useBudgly());

      act(() => {
        result.current.deleteTransaction("non-existent");
      });

      expect(result.current.transactions).toHaveLength(0);
    });

    it("should update transaction necessity and update state", () => {
      const transaction: Transaction = {
        id: "to-update",
        date: "2024-01-15T00:00:00.000Z",
        reason: "coffee",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      };
      storage.addTransaction(transaction);

      const { result } = renderHook(() => useBudgly());

      act(() => {
        result.current.updateNecessity("to-update", "need");
      });

      expect(result.current.transactions[0].necessity).toBe("need");
      // verify it's actually saved to storage
      const saved = storage.getTransactions();
      expect(saved[0].necessity).toBe("need");
    });

    it("should update transaction fields and update state", () => {
      const transaction: Transaction = {
        id: "to-update",
        date: "2024-01-15T00:00:00.000Z",
        reason: "coffee",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      };
      storage.addTransaction(transaction);

      const { result } = renderHook(() => useBudgly());

      act(() => {
        result.current.updateTransaction("to-update", {
          amount: 150,
          reason: "latte",
        });
      });

      expect(result.current.transactions[0].amount).toBe(150);
      expect(result.current.transactions[0].reason).toBe("latte");
      // verify it's actually saved to storage
      const saved = storage.getTransactions();
      expect(saved[0].amount).toBe(150);
      expect(saved[0].reason).toBe("latte");
    });

    it("should handle updating non-existent transaction gracefully", () => {
      const { result } = renderHook(() => useBudgly());

      act(() => {
        result.current.updateTransaction("non-existent", { amount: 200 });
      });

      expect(result.current.transactions).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    it("should handle storage quota exceeded error when adding transaction", () => {
      const { result } = renderHook(() => useBudgly());

      // mock setItem to throw QuotaExceededError
      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          const error = new DOMException(
            "Quota exceeded",
            "QuotaExceededError"
          );
          throw error;
        });

      // hook should throw or handle error - currently it will throw
      expect(() => {
        act(() => {
          result.current.addTransaction({
            date: "2024-01-15T00:00:00.000Z",
            reason: "coffee",
            amount: 100,
            paymentMode: "Cash",
            type: "expense",
            necessity: null,
          });
        });
      }).toThrow("Storage is full");

      setItemSpy.mockRestore();
    });

    it("should handle localStorage unavailable gracefully on initialization", () => {
      const getItemSpy = vi
        .spyOn(Storage.prototype, "getItem")
        .mockImplementation(() => {
          throw new Error("localStorage unavailable");
        });

      const { result } = renderHook(() => useBudgly());

      // should return defaults, not crash
      expect(result.current.transactions).toEqual([]);
      expect(result.current.theme).toBe("dark");

      getItemSpy.mockRestore();
    });
  });

  describe("theme operations", () => {
    it("should toggle theme from dark to light", () => {
      storage.saveTheme("dark");
      const { result } = renderHook(() => useBudgly());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(storage.getTheme()).toBe("light");
    });

    it("should toggle theme from light to dark", () => {
      storage.saveTheme("light");
      const { result } = renderHook(() => useBudgly());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(storage.getTheme()).toBe("dark");
    });
  });

  describe("settings operations", () => {
    it("should update payment modes and save to storage", () => {
      const newModes: PaymentMode[] = [
        { id: "1", name: "Cash", shorthand: "C" },
        { id: "3", name: "Credit Card", shorthand: "CC" },
      ];

      const { result } = renderHook(() => useBudgly());

      act(() => {
        result.current.updatePaymentModes(newModes);
      });

      expect(result.current.paymentModes).toEqual(newModes);
      expect(storage.getPaymentModes()).toEqual(newModes);
    });

    it("should update settings and save to storage", () => {
      const newSettings: AppSettings = {
        currency: "USD",
        currencySymbol: "$",
      };

      const { result } = renderHook(() => useBudgly());

      act(() => {
        result.current.updateSettings(newSettings);
      });

      expect(result.current.settings).toEqual(newSettings);
      expect(storage.getSettings()).toEqual(newSettings);
    });
  });

  describe("stats calculation", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should calculate stats for thisMonth period with proper date filtering", () => {
      // set fixed date: 2024-06-15 (mid-month)
      const fixedDate = new Date("2024-06-15T12:00:00.000Z");
      vi.setSystemTime(fixedDate);

      const thisMonth = new Date("2024-06-10T12:00:00.000Z");
      const lastMonth = new Date("2024-05-10T12:00:00.000Z");

      const transactions: Transaction[] = [
        {
          id: "1",
          date: thisMonth.toISOString(),
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: "need",
        },
        {
          id: "2",
          date: thisMonth.toISOString(),
          reason: "lunch",
          amount: 200,
          paymentMode: "Debit Card",
          type: "expense",
          necessity: "want",
        },
        {
          id: "3",
          date: lastMonth.toISOString(),
          reason: "old expense",
          amount: 50,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "4",
          date: thisMonth.toISOString(),
          reason: "salary",
          amount: 5000,
          paymentMode: "Cash",
          type: "income",
          necessity: null,
        },
      ];

      transactions.forEach((t) => storage.addTransaction(t));

      const { result } = renderHook(() => useBudgly());

      expect(result.current.stats.totalExpenses).toBe(300);
      expect(result.current.stats.totalIncome).toBe(5000);
      expect(result.current.stats.needsTotal).toBe(100);
      expect(result.current.stats.wantsTotal).toBe(200);
      expect(result.current.stats.uncategorized).toBe(0);
      expect(result.current.stats.transactionCount).toBe(3); // only this month
    });

    it("should calculate stats for lastMonth period", () => {
      const fixedDate = new Date("2024-06-15T12:00:00.000Z");
      vi.setSystemTime(fixedDate);

      const thisMonth = new Date("2024-06-10T12:00:00.000Z");
      const lastMonth = new Date("2024-05-10T12:00:00.000Z");

      const transactions: Transaction[] = [
        {
          id: "1",
          date: thisMonth.toISOString(),
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "2",
          date: lastMonth.toISOString(),
          reason: "lunch",
          amount: 200,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];

      transactions.forEach((t) => storage.addTransaction(t));

      const { result } = renderHook(() => useBudgly());

      act(() => {
        result.current.setTimePeriod("lastMonth");
      });

      expect(result.current.stats.totalExpenses).toBe(200);
      expect(result.current.stats.transactionCount).toBe(1);
    });

    it("should calculate stats for allTime period", () => {
      const fixedDate = new Date("2024-06-15T12:00:00.000Z");
      vi.setSystemTime(fixedDate);

      const thisMonth = new Date("2024-06-10T12:00:00.000Z");
      const lastMonth = new Date("2024-05-10T12:00:00.000Z");
      const oldDate = new Date("2023-01-10T12:00:00.000Z");

      const transactions: Transaction[] = [
        {
          id: "1",
          date: thisMonth.toISOString(),
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "2",
          date: lastMonth.toISOString(),
          reason: "lunch",
          amount: 200,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "3",
          date: oldDate.toISOString(),
          reason: "old expense",
          amount: 50,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];

      transactions.forEach((t) => storage.addTransaction(t));

      const { result } = renderHook(() => useBudgly());

      act(() => {
        result.current.setTimePeriod("allTime");
      });

      expect(result.current.stats.totalExpenses).toBe(350);
      expect(result.current.stats.transactionCount).toBe(3);
    });

    it("should handle empty transactions for stats", () => {
      const { result } = renderHook(() => useBudgly());

      expect(result.current.stats.totalExpenses).toBe(0);
      expect(result.current.stats.totalIncome).toBe(0);
      expect(result.current.stats.needsTotal).toBe(0);
      expect(result.current.stats.wantsTotal).toBe(0);
      expect(result.current.stats.uncategorized).toBe(0);
      expect(result.current.stats.transactionCount).toBe(0);
    });

    it("should calculate uncategorized expenses correctly", () => {
      const fixedDate = new Date("2024-06-15T12:00:00.000Z");
      vi.setSystemTime(fixedDate);

      const thisMonth = new Date("2024-06-10T12:00:00.000Z");

      const transactions: Transaction[] = [
        {
          id: "1",
          date: thisMonth.toISOString(),
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: "need",
        },
        {
          id: "2",
          date: thisMonth.toISOString(),
          reason: "lunch",
          amount: 200,
          paymentMode: "Cash",
          type: "expense",
          necessity: "want",
        },
        {
          id: "3",
          date: thisMonth.toISOString(),
          reason: "dinner",
          amount: 150,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];

      transactions.forEach((t) => storage.addTransaction(t));

      const { result } = renderHook(() => useBudgly());

      expect(result.current.stats.uncategorized).toBe(150);
    });
  });

  describe("time period", () => {
    it("should change time period and update stats", () => {
      const { result } = renderHook(() => useBudgly());

      expect(result.current.timePeriod).toBe("thisMonth");

      act(() => {
        result.current.setTimePeriod("allTime");
      });

      expect(result.current.timePeriod).toBe("allTime");
    });
  });

  describe("grouped transactions", () => {
    it("should group transactions by date with daily totals", () => {
      const date1 = new Date("2024-01-15T12:00:00.000Z");
      const date2 = new Date("2024-01-16T12:00:00.000Z");

      const transactions: Transaction[] = [
        {
          id: "1",
          date: date1.toISOString(),
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "2",
          date: date1.toISOString(),
          reason: "lunch",
          amount: 200,
          paymentMode: "Debit Card",
          type: "expense",
          necessity: null,
        },
        {
          id: "3",
          date: date2.toISOString(),
          reason: "dinner",
          amount: 300,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];

      transactions.forEach((t) => storage.addTransaction(t));

      const { result } = renderHook(() => useBudgly());

      const grouped = result.current.groupedTransactions;
      expect(grouped).toHaveLength(2);
      // most recent first
      expect(grouped[0][1].transactions).toHaveLength(1);
      expect(grouped[0][1].dayTotal).toBe(300);
      expect(grouped[1][1].transactions).toHaveLength(2);
      expect(grouped[1][1].dayTotal).toBe(300); // 100 + 200
    });

    it("should exclude income from daily totals", () => {
      const date = new Date("2024-01-15T12:00:00.000Z");

      const transactions: Transaction[] = [
        {
          id: "1",
          date: date.toISOString(),
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "2",
          date: date.toISOString(),
          reason: "salary",
          amount: 5000,
          paymentMode: "Cash",
          type: "income",
          necessity: null,
        },
      ];

      transactions.forEach((t) => storage.addTransaction(t));

      const { result } = renderHook(() => useBudgly());

      const grouped = result.current.groupedTransactions;
      expect(grouped).toHaveLength(1);
      expect(grouped[0][1].dayTotal).toBe(100); // only expense, not income
    });

    it("should handle empty transactions for grouping", () => {
      const { result } = renderHook(() => useBudgly());

      expect(result.current.groupedTransactions).toHaveLength(0);
    });
  });

  describe("quick add suggestions", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should generate quick add suggestions from recent transactions", () => {
      const fixedDate = new Date("2024-06-15T12:00:00.000Z");
      vi.setSystemTime(fixedDate);

      const recentDate = new Date("2024-06-13T12:00:00.000Z"); // 2 days ago
      const oldDate = new Date("2024-06-01T12:00:00.000Z"); // 14 days ago (outside 7 day window)

      const transactions: Transaction[] = [
        {
          id: "1",
          date: recentDate.toISOString(),
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "2",
          date: recentDate.toISOString(),
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "3",
          date: recentDate.toISOString(),
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "4",
          date: oldDate.toISOString(),
          reason: "old coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];

      transactions.forEach((t) => storage.addTransaction(t));

      const { result } = renderHook(() => useBudgly());

      const suggestions = result.current.quickAddSuggestions;
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].reason).toBe("coffee");
      expect(suggestions[0].amount).toBe(100);
    });

    it("should only suggest transactions used 2+ times", () => {
      const fixedDate = new Date("2024-06-15T12:00:00.000Z");
      vi.setSystemTime(fixedDate);

      const recentDate = new Date("2024-06-13T12:00:00.000Z");

      const transactions: Transaction[] = [
        {
          id: "1",
          date: recentDate.toISOString(),
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "2",
          date: recentDate.toISOString(),
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "3",
          date: recentDate.toISOString(),
          reason: "lunch",
          amount: 200,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        }, // only once, should not appear
      ];

      transactions.forEach((t) => storage.addTransaction(t));

      const { result } = renderHook(() => useBudgly());

      const suggestions = result.current.quickAddSuggestions;
      expect(suggestions.length).toBe(1);
      expect(suggestions[0].reason).toBe("coffee");
    });

    it("should exclude transactions older than 7 days", () => {
      const fixedDate = new Date("2024-06-15T12:00:00.000Z");
      vi.setSystemTime(fixedDate);

      const recentDate = new Date("2024-06-13T12:00:00.000Z"); // 2 days ago
      const oldDate = new Date("2024-06-01T12:00:00.000Z"); // 14 days ago

      const transactions: Transaction[] = [
        {
          id: "1",
          date: recentDate.toISOString(),
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "2",
          date: recentDate.toISOString(),
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "3",
          date: oldDate.toISOString(),
          reason: "old coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "4",
          date: oldDate.toISOString(),
          reason: "old coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];

      transactions.forEach((t) => storage.addTransaction(t));

      const { result } = renderHook(() => useBudgly());

      const suggestions = result.current.quickAddSuggestions;
      expect(suggestions.length).toBe(1);
      expect(suggestions[0].reason).toBe("coffee");
      expect(suggestions.every((s) => s.reason !== "old coffee")).toBe(true);
    });

    it("should handle empty transactions for suggestions", () => {
      const { result } = renderHook(() => useBudgly());

      expect(result.current.quickAddSuggestions).toHaveLength(0);
    });

    it("should only suggest expense transactions, not income", () => {
      const fixedDate = new Date("2024-06-15T12:00:00.000Z");
      vi.setSystemTime(fixedDate);

      const recentDate = new Date("2024-06-13T12:00:00.000Z");

      const transactions: Transaction[] = [
        {
          id: "1",
          date: recentDate.toISOString(),
          reason: "salary",
          amount: 5000,
          paymentMode: "Cash",
          type: "income",
          necessity: null,
        },
        {
          id: "2",
          date: recentDate.toISOString(),
          reason: "salary",
          amount: 5000,
          paymentMode: "Cash",
          type: "income",
          necessity: null,
        },
      ];

      transactions.forEach((t) => storage.addTransaction(t));

      const { result } = renderHook(() => useBudgly());

      expect(result.current.quickAddSuggestions).toHaveLength(0);
    });
  });
});
