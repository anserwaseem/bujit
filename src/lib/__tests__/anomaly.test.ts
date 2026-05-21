import { describe, it, expect } from "vitest";
import { detectAnomaly } from "../anomaly";
import type { Transaction } from "../types";

function tx(
  reason: string,
  amount: number,
  daysAgo: number,
  mode = "Cash"
): Transaction {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id: `${reason}-${daysAgo}-${amount}`,
    date: d.toISOString(),
    reason,
    amount,
    paymentMode: mode,
    type: "expense",
    necessity: null,
  };
}

describe("detectAnomaly", () => {
  it("returns null with insufficient history", () => {
    const history = [tx("grocery", 1000, 1), tx("grocery", 1100, 2)];
    const result = detectAnomaly(
      { reason: "grocery", paymentMode: "Cash", amount: 5000 },
      history
    );
    expect(result).toBeNull();
  });

  it("flags a clearly anomalous amount", () => {
    const history = Array.from({ length: 8 }, (_, i) =>
      tx("grocery", 1000 + i * 50, i + 1)
    );
    const result = detectAnomaly(
      { reason: "grocery", paymentMode: "Cash", amount: 5000 },
      history
    );
    expect(result).not.toBeNull();
    expect(result!.isAnomalous).toBe(true);
    expect(result!.factor).toBeGreaterThan(3);
  });

  it("does not flag a normal amount", () => {
    const history = Array.from({ length: 8 }, (_, i) =>
      tx("grocery", 1000 + i * 50, i + 1)
    );
    const result = detectAnomaly(
      { reason: "grocery", paymentMode: "Cash", amount: 1100 },
      history
    );
    expect(result!.isAnomalous).toBe(false);
  });

  it("matches case-insensitively and ignores other categories", () => {
    const history = [
      ...Array.from({ length: 6 }, (_, i) => tx("Grocery", 1000, i + 1)),
      tx("dining", 9999, 1), // noise that should be ignored
    ];
    const result = detectAnomaly(
      { reason: "grocery", paymentMode: "Cash", amount: 5000 },
      history
    );
    expect(result!.sampleSize).toBe(6);
    expect(result!.isAnomalous).toBe(true);
  });

  it("ignores transactions older than 90 days", () => {
    const history = [
      ...Array.from({ length: 6 }, (_, i) => tx("grocery", 1000, 100 + i)),
    ];
    const result = detectAnomaly(
      { reason: "grocery", paymentMode: "Cash", amount: 5000 },
      history
    );
    expect(result).toBeNull();
  });
});