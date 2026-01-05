import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAmountPresets } from "../useAmountPresets";
import type { Transaction } from "@/lib/types";

describe("useAmountPresets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return default presets when no transactions", () => {
    const { result } = renderHook(() => useAmountPresets([]));

    expect(result.current).toEqual([50, 100, 250, 500, 1000]);
  });

  it("should return default presets when no recent expenses (older than 30 days)", () => {
    const fixedDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(fixedDate);

    const oldDate = new Date("2024-04-01T12:00:00.000Z"); // 75 days ago

    const transactions: Transaction[] = [
      {
        id: "1",
        date: oldDate.toISOString(),
        reason: "old expense",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
    ];

    const { result } = renderHook(() => useAmountPresets(transactions));

    expect(result.current).toEqual([50, 100, 250, 500, 1000]);
  });

  it("should return default presets when only income transactions (no expenses)", () => {
    const fixedDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(fixedDate);

    const recentDate = new Date("2024-06-10T12:00:00.000Z"); // 5 days ago

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
    ];

    const { result } = renderHook(() => useAmountPresets(transactions));

    expect(result.current).toEqual([50, 100, 250, 500, 1000]);
  });

  it("should return most frequent amounts from last 30 days", () => {
    const fixedDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(fixedDate);

    const recentDate1 = new Date("2024-06-10T12:00:00.000Z"); // 5 days ago
    const recentDate2 = new Date("2024-06-12T12:00:00.000Z"); // 3 days ago

    const transactions: Transaction[] = [
      {
        id: "1",
        date: recentDate1.toISOString(),
        reason: "coffee",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "2",
        date: recentDate1.toISOString(),
        reason: "coffee",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "3",
        date: recentDate1.toISOString(),
        reason: "coffee",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "4",
        date: recentDate2.toISOString(),
        reason: "lunch",
        amount: 250,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "5",
        date: recentDate2.toISOString(),
        reason: "lunch",
        amount: 250,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "6",
        date: recentDate2.toISOString(),
        reason: "dinner",
        amount: 500,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
    ];

    const { result } = renderHook(() => useAmountPresets(transactions));

    // 100 appears 3 times, 250 appears 2 times, 500 appears 1 time
    // After sorting by frequency and value, then filling with defaults, should be sorted by value
    expect(result.current).toContain(100);
    expect(result.current).toContain(250);
    expect(result.current).toContain(500);
    expect(result.current.length).toBe(5);
    // Should be sorted by value
    expect(result.current).toEqual([50, 100, 250, 500, 1000]);
  });

  it("should sort frequent amounts by value after sorting by frequency", () => {
    const fixedDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(fixedDate);

    const recentDate = new Date("2024-06-10T12:00:00.000Z");

    const transactions: Transaction[] = [
      {
        id: "1",
        date: recentDate.toISOString(),
        reason: "a",
        amount: 500,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "2",
        date: recentDate.toISOString(),
        reason: "b",
        amount: 500,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "3",
        date: recentDate.toISOString(),
        reason: "c",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "4",
        date: recentDate.toISOString(),
        reason: "d",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "5",
        date: recentDate.toISOString(),
        reason: "e",
        amount: 250,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "6",
        date: recentDate.toISOString(),
        reason: "f",
        amount: 250,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
    ];

    const { result } = renderHook(() => useAmountPresets(transactions));

    // All have same frequency (2 each), so after sorting by value and filling defaults
    expect(result.current).toEqual([50, 100, 250, 500, 1000]);
  });

  it("should fill remaining slots with defaults when not enough frequent amounts", () => {
    const fixedDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(fixedDate);

    const recentDate = new Date("2024-06-10T12:00:00.000Z");

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
    ];

    const { result } = renderHook(() => useAmountPresets(transactions, 5));

    // Only 1 frequent amount (100), should fill with defaults
    expect(result.current).toHaveLength(5);
    expect(result.current).toContain(100);
    expect(result.current).toContain(50);
    expect(result.current).toContain(250);
    expect(result.current).toContain(500);
    expect(result.current).toContain(1000);
    // Should be sorted
    expect(result.current).toEqual([50, 100, 250, 500, 1000]);
  });

  it("should not duplicate defaults that are already in frequent amounts", () => {
    const fixedDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(fixedDate);

    const recentDate = new Date("2024-06-10T12:00:00.000Z");

    const transactions: Transaction[] = [
      {
        id: "1",
        date: recentDate.toISOString(),
        reason: "a",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "2",
        date: recentDate.toISOString(),
        reason: "b",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "3",
        date: recentDate.toISOString(),
        reason: "c",
        amount: 500,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "4",
        date: recentDate.toISOString(),
        reason: "d",
        amount: 500,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
    ];

    const { result } = renderHook(() => useAmountPresets(transactions, 5));

    // 100 and 500 are frequent, should fill with 50, 250, 1000
    expect(result.current).toHaveLength(5);
    expect(result.current).toContain(100);
    expect(result.current).toContain(500);
    expect(result.current).toContain(50);
    expect(result.current).toContain(250);
    expect(result.current).toContain(1000);
    // Should be sorted
    expect(result.current).toEqual([50, 100, 250, 500, 1000]);
  });

  it("should respect maxPresets parameter", () => {
    const fixedDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(fixedDate);

    const recentDate = new Date("2024-06-10T12:00:00.000Z");

    const transactions: Transaction[] = [
      {
        id: "1",
        date: recentDate.toISOString(),
        reason: "a",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "2",
        date: recentDate.toISOString(),
        reason: "b",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "3",
        date: recentDate.toISOString(),
        reason: "c",
        amount: 250,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "4",
        date: recentDate.toISOString(),
        reason: "d",
        amount: 250,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "5",
        date: recentDate.toISOString(),
        reason: "e",
        amount: 500,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "6",
        date: recentDate.toISOString(),
        reason: "f",
        amount: 500,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
    ];

    const { result } = renderHook(() => useAmountPresets(transactions, 3));

    expect(result.current).toHaveLength(3);
    // Should be top 3 most frequent, sorted by value
    expect(result.current).toEqual([100, 250, 500]);
  });

  it("should handle edge case: all transactions have same amount", () => {
    const fixedDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(fixedDate);

    const recentDate = new Date("2024-06-10T12:00:00.000Z");

    const transactions: Transaction[] = [
      {
        id: "1",
        date: recentDate.toISOString(),
        reason: "a",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "2",
        date: recentDate.toISOString(),
        reason: "b",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "3",
        date: recentDate.toISOString(),
        reason: "c",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
    ];

    const { result } = renderHook(() => useAmountPresets(transactions, 5));

    expect(result.current).toHaveLength(5);
    expect(result.current).toContain(100);
    // Should fill with defaults and sort by value
    expect(result.current).toEqual([50, 100, 250, 500, 1000]);
  });

  it("should handle edge case: all transactions have different amounts", () => {
    const fixedDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(fixedDate);

    const recentDate = new Date("2024-06-10T12:00:00.000Z");

    const transactions: Transaction[] = [
      {
        id: "1",
        date: recentDate.toISOString(),
        reason: "a",
        amount: 75,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "2",
        date: recentDate.toISOString(),
        reason: "b",
        amount: 150,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "3",
        date: recentDate.toISOString(),
        reason: "c",
        amount: 300,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
    ];

    const { result } = renderHook(() => useAmountPresets(transactions, 5));

    // All have frequency 1, so should be sorted by value, then filled with defaults
    expect(result.current).toHaveLength(5);
    expect(result.current).toContain(75);
    expect(result.current).toContain(150);
    expect(result.current).toContain(300);
    // Should include defaults that aren't already present, sorted by value
    // Takes top 3 frequent (75, 150, 300), then fills with 50, 100
    expect(result.current).toEqual([50, 75, 100, 150, 300]);
  });

  it("should handle date boundary: exactly 30 days ago", () => {
    const fixedDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(fixedDate);

    const exactly30DaysAgo = new Date("2024-05-16T12:00:00.000Z"); // exactly 30 days

    const transactions: Transaction[] = [
      {
        id: "1",
        date: exactly30DaysAgo.toISOString(),
        reason: "coffee",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
    ];

    const { result } = renderHook(() => useAmountPresets(transactions));

    // Should include this transaction (>= 30 days ago)
    expect(result.current).toContain(100);
  });

  it("should exclude transactions older than 30 days", () => {
    const fixedDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(fixedDate);

    const thirtyOneDaysAgo = new Date("2024-05-15T12:00:00.000Z"); // 31 days ago
    const recentDate = new Date("2024-06-10T12:00:00.000Z"); // 5 days ago

    const transactions: Transaction[] = [
      {
        id: "1",
        date: thirtyOneDaysAgo.toISOString(),
        reason: "old expense",
        amount: 999,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "2",
        date: recentDate.toISOString(),
        reason: "recent expense",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
    ];

    const { result } = renderHook(() => useAmountPresets(transactions));

    // Should only include recent transaction
    expect(result.current).toContain(100);
    expect(result.current).not.toContain(999);
  });

  it("should ignore income transactions", () => {
    const fixedDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(fixedDate);

    const recentDate = new Date("2024-06-10T12:00:00.000Z");

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
        reason: "coffee",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
    ];

    const { result } = renderHook(() => useAmountPresets(transactions));

    // Should only consider expense (100), not income (5000)
    expect(result.current).toContain(100);
    expect(result.current).not.toContain(5000);
  });

  it("should handle decimal amounts", () => {
    const fixedDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(fixedDate);

    const recentDate = new Date("2024-06-10T12:00:00.000Z");

    const transactions: Transaction[] = [
      {
        id: "1",
        date: recentDate.toISOString(),
        reason: "a",
        amount: 100.5,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "2",
        date: recentDate.toISOString(),
        reason: "b",
        amount: 100.5,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "3",
        date: recentDate.toISOString(),
        reason: "c",
        amount: 250.75,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
    ];

    const { result } = renderHook(() => useAmountPresets(transactions, 5));

    expect(result.current).toContain(100.5);
    expect(result.current).toContain(250.75);
  });

  it("should handle empty transactions array", () => {
    const { result } = renderHook(() => useAmountPresets([]));

    expect(result.current).toEqual([50, 100, 250, 500, 1000]);
  });

  it("should update when transactions change", () => {
    const fixedDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(fixedDate);

    const recentDate = new Date("2024-06-10T12:00:00.000Z");

    const initialTransactions: Transaction[] = [
      {
        id: "1",
        date: recentDate.toISOString(),
        reason: "a",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
    ];

    const { result, rerender } = renderHook(
      ({ transactions }) => useAmountPresets(transactions),
      { initialProps: { transactions: initialTransactions } }
    );

    expect(result.current).toContain(100);

    const newTransactions: Transaction[] = [
      {
        id: "2",
        date: recentDate.toISOString(),
        reason: "b",
        amount: 250,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
      {
        id: "3",
        date: recentDate.toISOString(),
        reason: "c",
        amount: 250,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      },
    ];

    rerender({ transactions: newTransactions });

    expect(result.current).toContain(250);
    // 100 might still be in defaults, so just check 250 is there
    expect(result.current.length).toBe(5);
  });
});
