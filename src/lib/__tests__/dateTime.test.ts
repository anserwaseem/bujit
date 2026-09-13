import { describe, expect, it } from "vitest";
import {
  combineDateAndTime,
  setTimeOnDate,
  sortTransactionsNewest,
  toTimeInputValue,
} from "../dateTime";

describe("dateTime", () => {
  it("preserves time when changing the calendar date", () => {
    const original = new Date(2026, 8, 12, 22, 47, 31, 250);
    const chosenDay = new Date(2026, 8, 8);
    const combined = combineDateAndTime(chosenDay, original);

    expect(combined.getFullYear()).toBe(2026);
    expect(combined.getMonth()).toBe(8);
    expect(combined.getDate()).toBe(8);
    expect(combined.getHours()).toBe(22);
    expect(combined.getMinutes()).toBe(47);
  });

  it("sets a native time input value on a date", () => {
    const updated = setTimeOnDate(new Date(2026, 8, 12, 1, 2), "14:35");
    expect(updated.getHours()).toBe(14);
    expect(updated.getMinutes()).toBe(35);
    expect(toTimeInputValue(updated)).toBe("14:35");
  });

  it("sorts transactions by exact timestamp newest first", () => {
    const transactions = [
      { id: "early", date: "2026-09-12T08:00:00.000Z" },
      { id: "late", date: "2026-09-12T18:00:00.000Z" },
    ];
    expect(sortTransactionsNewest(transactions).map((item) => item.id)).toEqual([
      "late",
      "early",
    ]);
  });
});