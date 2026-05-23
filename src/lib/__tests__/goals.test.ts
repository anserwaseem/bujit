import { describe, it, expect } from "vitest";
import { computeGoalProgress } from "../goals";
import type { Goal, Transaction } from "../types";

function tx(over: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    reason: "x",
    amount: 100,
    paymentMode: "Cash",
    type: "expense",
    necessity: null,
    ...over,
  };
}

const goal = (kind: Goal["kind"], target?: number): Goal => ({
  id: "g1",
  name: "n",
  kind,
  target,
  createdAt: new Date().toISOString(),
});

describe("computeGoalProgress", () => {
  it("savings: income adds, expense subtracts", () => {
    const g = goal("savings", 1000);
    const txs = [
      tx({ goalId: "g1", type: "income", amount: 400 }),
      tx({ goalId: "g1", type: "expense", amount: 100 }),
      tx({ type: "income", amount: 999 }), // not linked
    ];
    const p = computeGoalProgress(g, txs);
    expect(p.current).toBe(300);
    expect(p.percent).toBe(30);
    expect(p.remaining).toBe(700);
    expect(p.transactionCount).toBe(2);
  });

  it("owe: only expense counts toward payback", () => {
    const g = goal("owe", 500);
    const txs = [
      tx({ goalId: "g1", type: "expense", amount: 200 }),
      tx({ goalId: "g1", type: "income", amount: 9999 }),
    ];
    const p = computeGoalProgress(g, txs);
    expect(p.current).toBe(200);
    expect(p.percent).toBe(40);
    expect(p.remaining).toBe(300);
  });

  it("owed: only income counts toward collection", () => {
    const g = goal("owed", 1000);
    const txs = [
      tx({ goalId: "g1", type: "income", amount: 250 }),
      tx({ goalId: "g1", type: "expense", amount: 9999 }),
    ];
    const p = computeGoalProgress(g, txs);
    expect(p.current).toBe(250);
    expect(p.percent).toBe(25);
  });

  it("savings without target: percent is 0, no remaining", () => {
    const g = goal("savings");
    const txs = [tx({ goalId: "g1", type: "income", amount: 50 })];
    const p = computeGoalProgress(g, txs);
    expect(p.current).toBe(50);
    expect(p.percent).toBe(0);
    expect(p.remaining).toBeUndefined();
  });
});