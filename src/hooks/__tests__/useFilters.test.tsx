import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { FilterProvider, useFilters } from "../useFilters";
import type { Transaction } from "@/lib/types";
import { subMonths, subYears } from "date-fns";

// Helper to create a test transaction
const createTransaction = (
  id: string,
  reason: string,
  paymentMode: string,
  amount: number,
  date: Date,
  type: "expense" | "income" = "expense",
  necessity: "need" | "want" | null = null
): Transaction => ({
  id,
  date: date.toISOString(),
  reason,
  amount,
  paymentMode,
  type,
  necessity,
});

// Wrapper component for testing hooks that need FilterProvider
const wrapper = ({ children }: { children: ReactNode }) => (
  <FilterProvider>{children}</FilterProvider>
);

describe("useFilters", () => {
  beforeEach(() => {
    // Reset any state if needed
  });

  describe("initialization", () => {
    it("should initialize with default filter values", () => {
      const { result } = renderHook(() => useFilters(), { wrapper });

      expect(result.current.filters.timePeriod).toBe("thisMonth");
      expect(result.current.filters.customStartDate).toBeUndefined();
      expect(result.current.filters.customEndDate).toBeUndefined();
      expect(result.current.filters.searchQuery).toBe("");
      expect(result.current.filters.typeFilter).toBe("all");
      expect(result.current.filters.necessityFilter).toBe("all");
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe("time period filters", () => {
    it("should filter transactions for this month", () => {
      const now = new Date();
      const thisMonthTx = createTransaction("1", "coffee", "Cash", 100, now);
      const lastMonthTx = createTransaction(
        "2",
        "lunch",
        "Card",
        200,
        subMonths(now, 1)
      );

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTimePeriod("thisMonth");
      });

      const filtered = result.current.getFilteredTransactions([
        thisMonthTx,
        lastMonthTx,
      ]);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
    });

    it("should filter transactions for last month", () => {
      const now = new Date();
      const thisMonthTx = createTransaction("1", "coffee", "Cash", 100, now);
      const lastMonthTx = createTransaction(
        "2",
        "lunch",
        "Card",
        200,
        subMonths(now, 1)
      );

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTimePeriod("lastMonth");
      });

      const filtered = result.current.getFilteredTransactions([
        thisMonthTx,
        lastMonthTx,
      ]);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("2");
    });

    it("should filter transactions for this year", () => {
      const now = new Date();
      const thisYearTx = createTransaction("1", "coffee", "Cash", 100, now);
      const lastYearTx = createTransaction(
        "2",
        "lunch",
        "Card",
        200,
        subYears(now, 1)
      );

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTimePeriod("thisYear");
      });

      const filtered = result.current.getFilteredTransactions([
        thisYearTx,
        lastYearTx,
      ]);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
    });

    it("should filter transactions for last year", () => {
      const now = new Date();
      const thisYearTx = createTransaction("1", "coffee", "Cash", 100, now);
      const lastYearTx = createTransaction(
        "2",
        "lunch",
        "Card",
        200,
        subYears(now, 1)
      );

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTimePeriod("lastYear");
      });

      const filtered = result.current.getFilteredTransactions([
        thisYearTx,
        lastYearTx,
      ]);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("2");
    });

    it("should return all transactions for allTime period", () => {
      const now = new Date();
      const tx1 = createTransaction("1", "coffee", "Cash", 100, now);
      const tx2 = createTransaction(
        "2",
        "lunch",
        "Card",
        200,
        subMonths(now, 2)
      );
      const tx3 = createTransaction(
        "3",
        "dinner",
        "Cash",
        300,
        subYears(now, 2)
      );

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTimePeriod("allTime");
      });

      const filtered = result.current.getFilteredTransactions([tx1, tx2, tx3]);

      expect(filtered).toHaveLength(3);
    });

    it("should filter transactions for custom date range", () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 15);
      const midDate = new Date(now.getFullYear(), now.getMonth(), 10);
      const afterDate = new Date(now.getFullYear(), now.getMonth(), 20);

      const tx1 = createTransaction("1", "coffee", "Cash", 100, startDate);
      const tx2 = createTransaction("2", "lunch", "Card", 200, midDate);
      const tx3 = createTransaction("3", "dinner", "Cash", 300, afterDate);

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTimePeriod("custom");
        result.current.setCustomStartDate(startDate);
        result.current.setCustomEndDate(endDate);
      });

      const filtered = result.current.getFilteredTransactions([tx1, tx2, tx3]);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id).sort()).toEqual(["1", "2"]);
    });

    it("should clear custom dates when switching away from custom period", () => {
      const now = new Date();
      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTimePeriod("custom");
        result.current.setCustomStartDate(now);
        result.current.setCustomEndDate(now);
      });

      expect(result.current.filters.customStartDate).toBeDefined();
      expect(result.current.filters.customEndDate).toBeDefined();

      act(() => {
        result.current.setTimePeriod("thisMonth");
      });

      expect(result.current.filters.customStartDate).toBeUndefined();
      expect(result.current.filters.customEndDate).toBeUndefined();
    });
  });

  describe("search filter", () => {
    it("should filter transactions by reason (case-insensitive)", () => {
      const now = new Date();
      const tx1 = createTransaction("1", "Coffee Shop", "Cash", 100, now);
      const tx2 = createTransaction("2", "Lunch", "Card", 200, now);
      const tx3 = createTransaction("3", "coffee break", "Cash", 50, now);

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setSearchQuery("coffee");
      });

      const filtered = result.current.getFilteredTransactions([tx1, tx2, tx3]);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id).sort()).toEqual(["1", "3"]);
    });

    it("should filter transactions by payment mode (case-insensitive)", () => {
      const now = new Date();
      const tx1 = createTransaction("1", "Coffee", "Cash", 100, now);
      const tx2 = createTransaction("2", "Lunch", "Credit Card", 200, now);
      const tx3 = createTransaction("3", "Dinner", "cash", 50, now);

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setSearchQuery("cash");
      });

      const filtered = result.current.getFilteredTransactions([tx1, tx2, tx3]);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id).sort()).toEqual(["1", "3"]);
    });

    it("should return empty array when search query matches nothing", () => {
      const now = new Date();
      const tx1 = createTransaction("1", "Coffee", "Cash", 100, now);

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setSearchQuery("xyz");
      });

      const filtered = result.current.getFilteredTransactions([tx1]);

      expect(filtered).toHaveLength(0);
    });

    it("should ignore empty search query", () => {
      const now = new Date();
      const tx1 = createTransaction("1", "Coffee", "Cash", 100, now);

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setSearchQuery("   ");
      });

      const filtered = result.current.getFilteredTransactions([tx1]);

      expect(filtered).toHaveLength(1);
    });
  });

  describe("type filter", () => {
    it("should filter only expenses", () => {
      const now = new Date();
      const tx1 = createTransaction("1", "Coffee", "Cash", 100, now, "expense");
      const tx2 = createTransaction("2", "Salary", "Bank", 5000, now, "income");
      const tx3 = createTransaction("3", "Lunch", "Card", 200, now, "expense");

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTypeFilter("expense");
      });

      const filtered = result.current.getFilteredTransactions([tx1, tx2, tx3]);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id).sort()).toEqual(["1", "3"]);
    });

    it("should filter only income", () => {
      const now = new Date();
      const tx1 = createTransaction("1", "Coffee", "Cash", 100, now, "expense");
      const tx2 = createTransaction("2", "Salary", "Bank", 5000, now, "income");
      const tx3 = createTransaction("3", "Bonus", "Bank", 1000, now, "income");

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTypeFilter("income");
      });

      const filtered = result.current.getFilteredTransactions([tx1, tx2, tx3]);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id).sort()).toEqual(["2", "3"]);
    });

    it("should return all transactions when type filter is 'all'", () => {
      const now = new Date();
      const tx1 = createTransaction("1", "Coffee", "Cash", 100, now, "expense");
      const tx2 = createTransaction("2", "Salary", "Bank", 5000, now, "income");

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTypeFilter("all");
      });

      const filtered = result.current.getFilteredTransactions([tx1, tx2]);

      expect(filtered).toHaveLength(2);
    });
  });

  describe("necessity filter", () => {
    it("should filter only needs", () => {
      const now = new Date();
      const tx1 = createTransaction(
        "1",
        "Groceries",
        "Cash",
        100,
        now,
        "expense",
        "need"
      );
      const tx2 = createTransaction(
        "2",
        "Coffee",
        "Card",
        50,
        now,
        "expense",
        "want"
      );
      const tx3 = createTransaction(
        "3",
        "Rent",
        "Bank",
        1000,
        now,
        "expense",
        "need"
      );

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setNecessityFilter("need");
      });

      const filtered = result.current.getFilteredTransactions([tx1, tx2, tx3]);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id).sort()).toEqual(["1", "3"]);
    });

    it("should filter only wants", () => {
      const now = new Date();
      const tx1 = createTransaction(
        "1",
        "Groceries",
        "Cash",
        100,
        now,
        "expense",
        "need"
      );
      const tx2 = createTransaction(
        "2",
        "Coffee",
        "Card",
        50,
        now,
        "expense",
        "want"
      );
      const tx3 = createTransaction(
        "3",
        "Entertainment",
        "Card",
        200,
        now,
        "expense",
        "want"
      );

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setNecessityFilter("want");
      });

      const filtered = result.current.getFilteredTransactions([tx1, tx2, tx3]);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id).sort()).toEqual(["2", "3"]);
    });

    it("should filter only uncategorized expenses", () => {
      const now = new Date();
      const tx1 = createTransaction(
        "1",
        "Groceries",
        "Cash",
        100,
        now,
        "expense",
        "need"
      );
      const tx2 = createTransaction(
        "2",
        "Coffee",
        "Card",
        50,
        now,
        "expense",
        null
      );
      const tx3 = createTransaction(
        "3",
        "Lunch",
        "Cash",
        200,
        now,
        "expense",
        null
      );

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setNecessityFilter("uncategorized");
      });

      const filtered = result.current.getFilteredTransactions([tx1, tx2, tx3]);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id).sort()).toEqual(["2", "3"]);
    });

    it("should exclude income transactions when filtering by necessity", () => {
      const now = new Date();
      const tx1 = createTransaction(
        "1",
        "Groceries",
        "Cash",
        100,
        now,
        "expense",
        "need"
      );
      const tx2 = createTransaction("2", "Salary", "Bank", 5000, now, "income");

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setNecessityFilter("need");
      });

      const filtered = result.current.getFilteredTransactions([tx1, tx2]);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
    });
  });

  describe("combined filters", () => {
    it("should apply multiple filters simultaneously", () => {
      const now = new Date();
      const tx1 = createTransaction(
        "1",
        "Coffee Shop",
        "Cash",
        100,
        now,
        "expense",
        "want"
      );
      const tx2 = createTransaction(
        "2",
        "Coffee",
        "Card",
        50,
        now,
        "expense",
        "want"
      );
      const tx3 = createTransaction(
        "3",
        "Lunch",
        "Cash",
        200,
        now,
        "expense",
        "need"
      );
      const tx4 = createTransaction("4", "Coffee", "Cash", 75, now, "income");

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setSearchQuery("coffee");
        result.current.setTypeFilter("expense");
        result.current.setNecessityFilter("want");
      });

      const filtered = result.current.getFilteredTransactions([
        tx1,
        tx2,
        tx3,
        tx4,
      ]);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id).sort()).toEqual(["1", "2"]);
    });

    it("should work with date range and search filters", () => {
      const now = new Date();
      const lastMonth = subMonths(now, 1);
      const tx1 = createTransaction("1", "Coffee", "Cash", 100, now);
      const tx2 = createTransaction("2", "Coffee", "Card", 50, lastMonth);
      const tx3 = createTransaction("3", "Lunch", "Cash", 200, now);

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTimePeriod("thisMonth");
        result.current.setSearchQuery("coffee");
      });

      const filtered = result.current.getFilteredTransactions([tx1, tx2, tx3]);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
    });
  });

  describe("clearFilters", () => {
    it("should reset all filters to default values", () => {
      const now = new Date();
      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTimePeriod("lastMonth");
        result.current.setSearchQuery("test");
        result.current.setTypeFilter("expense");
        result.current.setNecessityFilter("want");
        result.current.setCustomStartDate(now);
        result.current.setCustomEndDate(now);
      });

      expect(result.current.hasActiveFilters).toBe(true);

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters.timePeriod).toBe("thisMonth");
      expect(result.current.filters.searchQuery).toBe("");
      expect(result.current.filters.typeFilter).toBe("all");
      expect(result.current.filters.necessityFilter).toBe("all");
      expect(result.current.filters.customStartDate).toBeUndefined();
      expect(result.current.filters.customEndDate).toBeUndefined();
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe("hasActiveFilters", () => {
    it("should return false when all filters are at default", () => {
      const { result } = renderHook(() => useFilters(), { wrapper });

      expect(result.current.hasActiveFilters).toBe(false);
    });

    it("should return true when time period is changed", () => {
      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTimePeriod("lastMonth");
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("should return true when search query is set", () => {
      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setSearchQuery("test");
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("should return true when type filter is changed", () => {
      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTypeFilter("expense");
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("should return true when necessity filter is changed", () => {
      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setNecessityFilter("want");
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("should return true when custom dates are set", () => {
      const now = new Date();
      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTimePeriod("custom");
        result.current.setCustomStartDate(now);
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty transaction array", () => {
      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setSearchQuery("test");
      });

      const filtered = result.current.getFilteredTransactions([]);

      expect(filtered).toHaveLength(0);
    });

    it("should handle custom date range with only start date", () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const beforeDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      const afterDate = new Date(now.getFullYear(), now.getMonth(), 10);

      const tx1 = createTransaction("1", "Coffee", "Cash", 100, beforeDate);
      const tx2 = createTransaction("2", "Lunch", "Card", 200, afterDate);

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTimePeriod("custom");
        result.current.setCustomStartDate(startDate);
      });

      const filtered = result.current.getFilteredTransactions([tx1, tx2]);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("2");
    });

    it("should handle custom date range with only end date", () => {
      const now = new Date();
      const endDate = new Date(now.getFullYear(), now.getMonth(), 15);
      const beforeDate = new Date(now.getFullYear(), now.getMonth(), 10);
      const afterDate = new Date(now.getFullYear(), now.getMonth(), 20);

      const tx1 = createTransaction("1", "Coffee", "Cash", 100, beforeDate);
      const tx2 = createTransaction("2", "Lunch", "Card", 200, afterDate);

      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current.setTimePeriod("custom");
        result.current.setCustomEndDate(endDate);
      });

      const filtered = result.current.getFilteredTransactions([tx1, tx2]);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
    });
  });
});
