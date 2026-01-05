import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAutoComplete } from "../useAutoComplete";
import type { Transaction } from "@/lib/types";

describe("useAutoComplete", () => {
  const createTransaction = (
    id: string,
    reason: string,
    paymentMode: string,
    amount: number,
    date: Date
  ): Transaction => ({
    id,
    date: date.toISOString(),
    reason,
    amount,
    paymentMode,
    type: "expense",
    necessity: null,
  });

  it("should return empty array when input is empty", () => {
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, new Date()),
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, ""));

    expect(result.current).toEqual([]);
  });

  it("should return empty array when input is less than 2 characters", () => {
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, new Date()),
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, "c"));

    expect(result.current).toEqual([]);
  });

  it("should return empty array when no transactions", () => {
    const { result } = renderHook(() => useAutoComplete([], "coffee"));

    expect(result.current).toEqual([]);
  });

  it("should return empty array when only income transactions", () => {
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

    const { result } = renderHook(() =>
      useAutoComplete(transactions, "salary")
    );

    expect(result.current).toEqual([]);
  });

  it("should match exact prefix on reason with highest score", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now),
      createTransaction("2", "coffee shop", "Cash", 150, now),
      createTransaction("3", "lunch", "Cash", 200, now),
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, "cof"));

    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current[0].transaction.reason).toBe("coffee");
    expect(result.current[0].matchScore).toBeGreaterThan(50);
  });

  it("should give higher score to shorter prefix matches", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now),
      createTransaction("2", "coffee shop", "Cash", 150, now),
    ];

    const { result: shortResult } = renderHook(() =>
      useAutoComplete(transactions, "co")
    );
    const { result: longResult } = renderHook(() =>
      useAutoComplete(transactions, "coffee")
    );

    // Shorter match should have higher score (100 - length)
    expect(shortResult.current[0].matchScore).toBeGreaterThan(
      longResult.current[0].matchScore
    );
  });

  it("should match contains on reason with medium score", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "starbucks coffee", "Cash", 100, now),
      createTransaction("2", "lunch", "Cash", 200, now),
    ];

    const { result } = renderHook(() =>
      useAutoComplete(transactions, "coffee")
    );

    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current[0].transaction.reason).toBe("starbucks coffee");
    expect(result.current[0].matchScore).toBe(50);
  });

  it("should match full text with lowest score", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "lunch", "Cash", 100, now),
      createTransaction("2", "dinner", "Debit Card", 200, now),
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, "Cash"));

    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current[0].matchScore).toBe(25);
  });

  it("should prioritize most recent transactions before scoring", () => {
    const oldDate = new Date("2024-01-01");
    const recentDate = new Date("2024-06-15");

    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, oldDate),
      createTransaction("2", "coffee", "Cash", 100, recentDate),
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, "cof"));

    // Both match, but recent one should appear first
    expect(result.current[0].transaction.id).toBe("2");
  });

  it("should deduplicate by reason+paymentMode+amount", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now),
      createTransaction("2", "coffee", "Cash", 100, now),
      createTransaction("3", "coffee", "Cash", 100, now),
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, "cof"));

    // Should only return one suggestion (deduplicated)
    expect(result.current.length).toBe(1);
    expect(result.current[0].transaction.reason).toBe("coffee");
  });

  it("should not deduplicate if payment mode differs", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now),
      createTransaction("2", "coffee", "Debit Card", 100, now),
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, "cof"));

    expect(result.current.length).toBe(2);
  });

  it("should not deduplicate if amount differs", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now),
      createTransaction("2", "coffee", "Cash", 150, now),
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, "cof"));

    expect(result.current.length).toBe(2);
  });

  it("should respect maxSuggestions parameter", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now),
      createTransaction("2", "lunch", "Cash", 200, now),
      createTransaction("3", "dinner", "Cash", 300, now),
      createTransaction("4", "breakfast", "Cash", 150, now),
      createTransaction("5", "snack", "Cash", 50, now),
      createTransaction("6", "drink", "Cash", 75, now),
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, "c", 3));

    expect(result.current.length).toBeLessThanOrEqual(3);
  });

  it("should be case-insensitive", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "Coffee", "Cash", 100, now),
      createTransaction("2", "COFFEE", "Cash", 150, now),
      createTransaction("3", "coffee", "Cash", 200, now),
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, "COF"));

    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current[0].transaction.reason.toLowerCase()).toBe("coffee");
  });

  it("should handle whitespace in input", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now),
    ];

    const { result } = renderHook(() =>
      useAutoComplete(transactions, "  coffee  ")
    );

    expect(result.current.length).toBeGreaterThan(0);
  });

  it("should handle special characters in reason", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee & tea", "Cash", 100, now),
      createTransaction("2", "lunch (restaurant)", "Cash", 200, now),
    ];

    const { result } = renderHook(() =>
      useAutoComplete(transactions, "coffee &")
    );

    expect(result.current.length).toBeGreaterThan(0);
  });

  it("should sort by match score (highest first)", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now), // exact prefix - highest
      createTransaction("2", "starbucks coffee", "Cash", 150, now), // contains - medium
      createTransaction("3", "lunch", "Cash", 200, now), // full text - lowest
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, "cof"));

    expect(result.current.length).toBeGreaterThan(1);
    // Exact prefix should be first
    expect(result.current[0].transaction.reason).toBe("coffee");
    expect(result.current[0].matchScore).toBeGreaterThan(
      result.current[1].matchScore
    );
  });

  it("should return top N after sorting", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now),
      createTransaction("2", "coffee shop", "Cash", 150, now),
      createTransaction("3", "coffee break", "Cash", 200, now),
      createTransaction("4", "coffee time", "Cash", 250, now),
      createTransaction("5", "coffee bean", "Cash", 300, now),
    ];

    const { result } = renderHook(() =>
      useAutoComplete(transactions, "cof", 2)
    );

    expect(result.current.length).toBe(2);
    // Should be top 2 by score
    expect(result.current[0].matchScore).toBeGreaterThanOrEqual(
      result.current[1].matchScore
    );
  });

  it("should include full text in suggestion", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now),
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, "cof"));

    expect(result.current[0].text).toBe("coffee Cash 100");
  });

  it("should handle multiple matches with same score", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now),
      createTransaction("2", "coffee", "Debit Card", 100, now),
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, "cof"));

    // Both should match with same score, recent first
    expect(result.current.length).toBe(2);
  });

  it("should handle no matches", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now),
      createTransaction("2", "lunch", "Cash", 200, now),
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, "xyz"));

    expect(result.current).toEqual([]);
  });

  it("should update when input changes", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now),
      createTransaction("2", "lunch", "Cash", 200, now),
    ];

    const { result, rerender } = renderHook(
      ({ input }) => useAutoComplete(transactions, input),
      { initialProps: { input: "cof" } }
    );

    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current[0].transaction.reason).toBe("coffee");

    rerender({ input: "lun" });

    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current[0].transaction.reason).toBe("lunch");
  });

  it("should update when transactions change", () => {
    const now = new Date();
    const initialTransactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now),
    ];

    const { result, rerender } = renderHook(
      ({ transactions, input }) => useAutoComplete(transactions, input),
      { initialProps: { transactions: initialTransactions, input: "cof" } }
    );

    expect(result.current.length).toBe(1);

    const newTransactions: Transaction[] = [
      createTransaction("2", "lunch", "Cash", 200, now),
    ];

    rerender({ transactions: newTransactions, input: "lun" });

    expect(result.current.length).toBe(1);
    expect(result.current[0].transaction.reason).toBe("lunch");
  });

  it("should handle very long input", () => {
    const now = new Date();
    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, now),
    ];

    const longInput = "a".repeat(100);
    const { result } = renderHook(() =>
      useAutoComplete(transactions, longInput)
    );

    // Should handle gracefully (no matches)
    expect(result.current).toEqual([]);
  });

  it("should handle transactions with same reason but different dates", () => {
    const oldDate = new Date("2024-01-01");
    const recentDate = new Date("2024-06-15");

    const transactions: Transaction[] = [
      createTransaction("1", "coffee", "Cash", 100, oldDate),
      createTransaction("2", "coffee", "Cash", 100, recentDate),
    ];

    const { result } = renderHook(() => useAutoComplete(transactions, "cof"));

    // Should deduplicate, keeping most recent
    expect(result.current.length).toBe(1);
    expect(result.current[0].transaction.id).toBe("2");
  });
});
