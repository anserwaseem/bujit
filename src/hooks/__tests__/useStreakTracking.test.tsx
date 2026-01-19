import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStreakTracking } from "../useStreakTracking";
import { Transaction } from "@/lib/types";
import { startOfDay, subDays } from "date-fns";

describe("useStreakTracking", () => {
  beforeEach(() => {
    // Clear any localStorage if needed
    localStorage.clear();
  });

  const createTransaction = (
    daysAgo: number,
    type: "expense" | "income" = "expense"
  ): Transaction => {
    const date = subDays(startOfDay(new Date()), daysAgo);
    return {
      id: `test-${daysAgo}`,
      date: date.toISOString(),
      reason: "Test",
      amount: 100,
      paymentMode: "CC",
      type,
      necessity: type === "expense" ? "want" : null,
    };
  };

  it("should calculate no-expense streak correctly", () => {
    // No transactions = no-expense streak of 1 (today)
    const { result } = renderHook(() => useStreakTracking([]));
    expect(result.current.streakData.noExpenseStreak).toBeGreaterThanOrEqual(1);
  });

  it("should calculate spending streak correctly", () => {
    // Transaction today = spending streak of 1
    const transactions = [createTransaction(0, "expense")];
    const { result } = renderHook(() => useStreakTracking(transactions));
    expect(result.current.streakData.spendingStreak).toBe(1);
    expect(result.current.streakData.noExpenseStreak).toBe(0);
  });

  it("should track consecutive days with expenses", () => {
    // Transactions today, yesterday, 2 days ago
    const transactions = [
      createTransaction(0, "expense"),
      createTransaction(1, "expense"),
      createTransaction(2, "expense"),
    ];
    const { result } = renderHook(() => useStreakTracking(transactions));
    expect(result.current.streakData.spendingStreak).toBe(3);
  });

  it("should track consecutive days without expenses", () => {
    // No expense transactions, but income is OK
    const transactions = [
      createTransaction(0, "income"),
      createTransaction(1, "income"),
      createTransaction(2, "income"),
    ];
    const { result } = renderHook(() => useStreakTracking(transactions));
    expect(result.current.streakData.noExpenseStreak).toBeGreaterThanOrEqual(3);
    expect(result.current.streakData.spendingStreak).toBe(0);
  });

  it("should break spending streak when gap exists", () => {
    // Transactions today and 2 days ago (yesterday missing)
    const transactions = [
      createTransaction(0, "expense"),
      createTransaction(2, "expense"),
    ];
    const { result } = renderHook(() => useStreakTracking(transactions));
    // Streak should only be 1 (today), not 2
    expect(result.current.streakData.spendingStreak).toBe(1);
  });

  it("should break no-expense streak when expense occurs", () => {
    // Income yesterday, expense today
    const transactions = [
      createTransaction(0, "expense"),
      createTransaction(1, "income"),
      createTransaction(2, "income"),
    ];
    const { result } = renderHook(() => useStreakTracking(transactions));
    expect(result.current.streakData.noExpenseStreak).toBe(0);
    expect(result.current.streakData.spendingStreak).toBe(1);
  });

  it("should handle mixed income and expenses correctly", () => {
    // Today: expense, Yesterday: income, 2 days ago: expense
    const transactions = [
      createTransaction(0, "expense"),
      createTransaction(1, "income"),
      createTransaction(2, "expense"),
    ];
    const { result } = renderHook(() => useStreakTracking(transactions));
    // Spending streak should be 1 (today only, yesterday had no expense)
    expect(result.current.streakData.spendingStreak).toBe(1);
    // No-expense streak should be 0 (today has expense)
    expect(result.current.streakData.noExpenseStreak).toBe(0);
  });

  it("should recalculate streaks when transactions change", () => {
    const { result, rerender } = renderHook(
      ({ transactions }) => useStreakTracking(transactions),
      {
        initialProps: { transactions: [] },
      }
    );

    // Initially no expenses
    expect(result.current.streakData.noExpenseStreak).toBeGreaterThanOrEqual(1);
    expect(result.current.streakData.spendingStreak).toBe(0);

    // Add expense transaction
    rerender({ transactions: [createTransaction(0, "expense")] });
    expect(result.current.streakData.spendingStreak).toBe(1);
    expect(result.current.streakData.noExpenseStreak).toBe(0);
  });

  it("should handle edge case: all transactions are income", () => {
    const transactions = [
      createTransaction(0, "income"),
      createTransaction(1, "income"),
      createTransaction(2, "income"),
      createTransaction(3, "income"),
    ];
    const { result } = renderHook(() => useStreakTracking(transactions));
    expect(result.current.streakData.noExpenseStreak).toBeGreaterThanOrEqual(4);
    expect(result.current.streakData.spendingStreak).toBe(0);
  });

  it("should handle edge case: no transactions at all", () => {
    const { result } = renderHook(() => useStreakTracking([]));
    expect(result.current.streakData.noExpenseStreak).toBeGreaterThanOrEqual(1);
    expect(result.current.streakData.spendingStreak).toBe(0);
  });

  it("should calculate streaks correctly with many days", () => {
    // Create expenses for last 7 days
    const transactions = Array.from({ length: 7 }, (_, i) =>
      createTransaction(i, "expense")
    );
    const { result } = renderHook(() => useStreakTracking(transactions));
    expect(result.current.streakData.spendingStreak).toBe(7);
    expect(result.current.streakData.noExpenseStreak).toBe(0);
  });

  it("should handle transactions on same day correctly", () => {
    // Multiple expenses on same day should still count as 1 day
    const today = startOfDay(new Date());
    const transactions: Transaction[] = [
      {
        id: "1",
        date: today.toISOString(),
        reason: "Coffee",
        amount: 50,
        paymentMode: "CC",
        type: "expense",
        necessity: "want",
      },
      {
        id: "2",
        date: today.toISOString(),
        reason: "Lunch",
        amount: 200,
        paymentMode: "CC",
        type: "expense",
        necessity: "want",
      },
    ];
    const { result } = renderHook(() => useStreakTracking(transactions));
    expect(result.current.streakData.spendingStreak).toBe(1);
  });
});
