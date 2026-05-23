import { describe, it, expect } from "vitest";
import { processDueRecurring, nextFireDate } from "../recurring";
import type { RecurringRule } from "../types";

function rule(over: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: "r1",
    template: {
      reason: "rent",
      amount: 1000,
      paymentMode: "Cash",
      type: "expense",
      necessity: null,
    },
    cadence: "monthly",
    dayOfMonth: 1,
    startDate: "2026-01-01T00:00:00.000Z",
    active: true,
    ...over,
  };
}

describe("processDueRecurring", () => {
  it("fires once at start date and updates lastFiredDate", () => {
    const now = new Date("2026-01-15T12:00:00Z");
    const r = rule();
    const { newTransactions, updatedRules } = processDueRecurring([r], now);
    expect(newTransactions).toHaveLength(1);
    expect(updatedRules[0].lastFiredDate).toBeDefined();
  });

  it("catches up missed monthly periods", () => {
    const now = new Date("2026-04-15T12:00:00Z");
    const r = rule();
    const { newTransactions } = processDueRecurring([r], now);
    // Jan, Feb, Mar, Apr = 4
    expect(newTransactions).toHaveLength(4);
  });

  it("is idempotent — no fire when up to date", () => {
    const now = new Date("2026-01-05T12:00:00Z");
    const r = rule({ lastFiredDate: "2026-01-01T00:00:00.000Z" });
    const { newTransactions } = processDueRecurring([r], now);
    expect(newTransactions).toHaveLength(0);
  });

  it("inactive rules do not fire", () => {
    const now = new Date("2026-12-01T12:00:00Z");
    const r = rule({ active: false });
    const { newTransactions } = processDueRecurring([r], now);
    expect(newTransactions).toHaveLength(0);
  });

  it("daily cadence advances by 1 day", () => {
    const r = rule({
      cadence: "daily",
      lastFiredDate: "2026-05-01T00:00:00.000Z",
    });
    const next = nextFireDate(r);
    expect(next.getUTCDate()).toBe(2);
  });
});