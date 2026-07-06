import { describe, it, expect, beforeEach } from "vitest";
import {
  exportVault,
  decodeVault,
  importVault,
  sha256Hex,
  bytesToBase64,
  base64ToBytes,
} from "../vault";
import type { Transaction, Goal } from "../types";

function seedTransactions(list: Transaction[]) {
  localStorage.setItem("bujit_transactions", JSON.stringify(list));
}
function seedGoals(list: Goal[]) {
  localStorage.setItem("bujit_goals", JSON.stringify(list));
}

describe("vault", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips an empty vault", async () => {
    const blob = await exportVault();
    const decoded = await decodeVault(blob.bytes, blob.checksum);
    expect(decoded.v).toBe(1);
    expect(decoded.transactions).toEqual([]);
    expect(decoded.goals).toEqual([]);
  });

  it("round-trips transactions and goals", async () => {
    const t: Transaction = {
      id: "t1",
      date: "2026-01-01T10:00:00.000Z",
      reason: "coffee",
      amount: 200,
      paymentMode: "C",
      type: "expense",
      necessity: "want",
    };
    const g: Goal = {
      id: "g1",
      name: "Emergency",
      kind: "savings",
      target: 10000,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    seedTransactions([t]);
    seedGoals([g]);

    const blob = await exportVault();
    const decoded = await decodeVault(blob.bytes, blob.checksum);
    expect(decoded.transactions).toEqual([t]);
    expect(decoded.goals).toEqual([g]);
  });

  it("rejects a corrupted checksum", async () => {
    const blob = await exportVault();
    await expect(
      decodeVault(blob.bytes, "deadbeef".repeat(8))
    ).rejects.toThrow(/checksum/i);
  });

  it("replace mode wipes and restores", async () => {
    seedTransactions([
      {
        id: "old",
        date: "2025-01-01T00:00:00.000Z",
        reason: "old",
        amount: 1,
        paymentMode: "C",
        type: "expense",
        necessity: null,
      },
    ]);

    const envelope = {
      v: 1,
      ts: "2026-01-01T00:00:00.000Z",
      vaultId: "abc12345",
      transactions: [
        {
          id: "new",
          date: "2026-01-01T00:00:00.000Z",
          reason: "new",
          amount: 5,
          paymentMode: "C",
          type: "expense" as const,
          necessity: null,
        },
      ],
      goals: [],
      recurring: [],
      paymentModes: [{ id: "p", name: "Cash", shorthand: "C" }],
      settings: { currency: "USD", currencySymbol: "$" },
      dashboardLayout: [],
    };

    const summary = importVault(envelope, "replace");
    expect(summary.transactions.total).toBe(1);
    const stored = JSON.parse(
      localStorage.getItem("bujit_transactions") ?? "[]"
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("new");
  });

  it("merge mode dedupes by id and counts additions", async () => {
    seedTransactions([
      {
        id: "shared",
        date: "2025-01-01T00:00:00.000Z",
        reason: "old",
        amount: 1,
        paymentMode: "C",
        type: "expense",
        necessity: null,
      },
    ]);

    const envelope = {
      v: 1,
      ts: "2026-01-01T00:00:00.000Z",
      vaultId: "abc12345",
      transactions: [
        {
          id: "shared", // conflict
          date: "2026-01-01T00:00:00.000Z",
          reason: "updated",
          amount: 2,
          paymentMode: "C",
          type: "expense" as const,
          necessity: null,
        },
        {
          id: "brand-new",
          date: "2026-01-02T00:00:00.000Z",
          reason: "new",
          amount: 3,
          paymentMode: "C",
          type: "expense" as const,
          necessity: null,
        },
      ],
      goals: [],
      recurring: [],
      paymentModes: [],
      settings: { currency: "USD", currencySymbol: "$" },
      dashboardLayout: [],
    };

    const summary = importVault(envelope, "merge");
    expect(summary.transactions.added).toBe(1);
    expect(summary.transactions.skipped).toBe(1);
    expect(summary.transactions.total).toBe(2);

    const stored = JSON.parse(
      localStorage.getItem("bujit_transactions") ?? "[]"
    );
    // Incoming wins on conflict
    const shared = stored.find((t: Transaction) => t.id === "shared");
    expect(shared.reason).toBe("updated");
  });

  it("sha256Hex is stable across identical inputs", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const a = await sha256Hex(bytes);
    const b = await sha256Hex(new Uint8Array([1, 2, 3, 4, 5]));
    expect(a).toBe(b);
  });

  it("base64 helpers round-trip binary", () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255, 42]);
    const b64 = bytesToBase64(bytes);
    const back = base64ToBytes(b64);
    expect(Array.from(back)).toEqual(Array.from(bytes));
  });
});