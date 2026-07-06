/**
 * Local-first vault serialization for device-to-device transfer.
 *
 * Gathers all Bujit localStorage data into a single compact JSON envelope,
 * gzips it, and produces a SHA-256 checksum for integrity. The output is
 * suitable for QR transfer or file export (.bujit).
 *
 * NOTHING here talks to a network. All data stays on-device.
 */
import { inflate, deflate } from "pako";
import type {
  Transaction,
  PaymentMode,
  AppSettings,
  Goal,
  RecurringRule,
  DashboardCard,
} from "./types";
import {
  getTransactions,
  getPaymentModes,
  getSettings,
  getGoals,
  getRecurringRules,
  getDashboardLayout,
  savePaymentModes,
  saveSettings,
  saveGoals,
  saveRecurringRules,
  saveDashboardLayout,
} from "./storage";

export const VAULT_VERSION = 1;

export interface VaultEnvelope {
  v: number;
  ts: string;
  vaultId: string;
  transactions: Transaction[];
  goals: Goal[];
  recurring: RecurringRule[];
  paymentModes: PaymentMode[];
  settings: AppSettings;
  dashboardLayout: DashboardCard[];
}

export interface VaultBlob {
  bytes: Uint8Array;
  checksum: string; // hex sha-256
  envelope: VaultEnvelope;
}

export interface VaultStats {
  transactions: number;
  goals: number;
  recurring: number;
  paymentModes: number;
  bytes: number;
}

export interface ImportSummary {
  mode: "replace" | "merge";
  transactions: { added: number; skipped: number; total: number };
  goals: { added: number; skipped: number; total: number };
  recurring: { added: number; skipped: number; total: number };
  paymentModes: { added: number; skipped: number; total: number };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function randomVaultId(): string {
  // 8 hex chars — enough entropy for a session id, not used as a secret
  const bytes = new Uint8Array(4);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++)
      bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function buildEnvelope(): VaultEnvelope {
  return {
    v: VAULT_VERSION,
    ts: new Date().toISOString(),
    vaultId: randomVaultId(),
    transactions: getTransactions(),
    goals: getGoals(),
    recurring: getRecurringRules(),
    paymentModes: getPaymentModes(),
    settings: getSettings(),
    dashboardLayout: getDashboardLayout(),
  };
}

export async function exportVault(): Promise<VaultBlob> {
  const envelope = buildEnvelope();
  const json = JSON.stringify(envelope);
  const bytes = deflate(json, { level: 9 });
  const checksum = await sha256Hex(bytes);
  return { bytes, checksum, envelope };
}

export function vaultStats(envelope: VaultEnvelope, byteLen: number): VaultStats {
  return {
    transactions: envelope.transactions.length,
    goals: envelope.goals.length,
    recurring: envelope.recurring.length,
    paymentModes: envelope.paymentModes.length,
    bytes: byteLen,
  };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export async function decodeVault(
  bytes: Uint8Array,
  expectedChecksum?: string
): Promise<VaultEnvelope> {
  if (expectedChecksum) {
    const actual = await sha256Hex(bytes);
    if (actual.toLowerCase() !== expectedChecksum.toLowerCase()) {
      throw new Error("Checksum mismatch — data may be corrupted");
    }
  }
  let json: string;
  try {
    json = inflate(bytes, { to: "string" });
  } catch (e) {
    throw new Error("Failed to decompress vault: " + (e as Error).message);
  }
  const parsed = JSON.parse(json) as VaultEnvelope;
  if (!parsed || typeof parsed !== "object" || parsed.v !== VAULT_VERSION) {
    throw new Error(
      `Unsupported vault version (expected ${VAULT_VERSION}, got ${parsed?.v})`
    );
  }
  return parsed;
}

export function importVault(
  envelope: VaultEnvelope,
  mode: "replace" | "merge"
): ImportSummary {
  const currentTxns = getTransactions();
  const currentGoals = getGoals();
  const currentRec = getRecurringRules();
  const currentModes = getPaymentModes();

  const summary: ImportSummary = {
    mode,
    transactions: { added: 0, skipped: 0, total: 0 },
    goals: { added: 0, skipped: 0, total: 0 },
    recurring: { added: 0, skipped: 0, total: 0 },
    paymentModes: { added: 0, skipped: 0, total: 0 },
  };

  if (mode === "replace") {
    saveTransactionsDirect(envelope.transactions);
    saveGoals(envelope.goals);
    saveRecurringRules(envelope.recurring);
    savePaymentModes(envelope.paymentModes);
    saveSettings(envelope.settings);
    if (envelope.dashboardLayout?.length)
      saveDashboardLayout(envelope.dashboardLayout);

    summary.transactions = {
      added: envelope.transactions.length,
      skipped: 0,
      total: envelope.transactions.length,
    };
    summary.goals = {
      added: envelope.goals.length,
      skipped: 0,
      total: envelope.goals.length,
    };
    summary.recurring = {
      added: envelope.recurring.length,
      skipped: 0,
      total: envelope.recurring.length,
    };
    summary.paymentModes = {
      added: envelope.paymentModes.length,
      skipped: 0,
      total: envelope.paymentModes.length,
    };
    return summary;
  }

  // merge — dedupe by id, incoming wins on conflict
  const mergedTxns = mergeById(currentTxns, envelope.transactions);
  const mergedGoals = mergeById(currentGoals, envelope.goals);
  const mergedRec = mergeById(currentRec, envelope.recurring);
  // payment modes: dedupe by shorthand (case-insensitive) since ids differ per device
  const mergedModes = mergeModes(currentModes, envelope.paymentModes);

  saveTransactionsDirect(mergedTxns.list);
  saveGoals(mergedGoals.list);
  saveRecurringRules(mergedRec.list);
  savePaymentModes(mergedModes.list);

  summary.transactions = {
    added: mergedTxns.added,
    skipped: mergedTxns.skipped,
    total: mergedTxns.list.length,
  };
  summary.goals = {
    added: mergedGoals.added,
    skipped: mergedGoals.skipped,
    total: mergedGoals.list.length,
  };
  summary.recurring = {
    added: mergedRec.added,
    skipped: mergedRec.skipped,
    total: mergedRec.list.length,
  };
  summary.paymentModes = {
    added: mergedModes.added,
    skipped: mergedModes.skipped,
    total: mergedModes.list.length,
  };
  return summary;
}

function mergeById<T extends { id: string }>(
  current: T[],
  incoming: T[]
): { list: T[]; added: number; skipped: number } {
  const byId = new Map<string, T>();
  for (const item of current) byId.set(item.id, item);
  let added = 0;
  let skipped = 0;
  for (const item of incoming) {
    if (byId.has(item.id)) {
      skipped++;
      // incoming wins on conflict
      byId.set(item.id, item);
    } else {
      added++;
      byId.set(item.id, item);
    }
  }
  return { list: Array.from(byId.values()), added, skipped };
}

function mergeModes(
  current: PaymentMode[],
  incoming: PaymentMode[]
): { list: PaymentMode[]; added: number; skipped: number } {
  const bySh = new Map<string, PaymentMode>();
  for (const m of current) bySh.set(m.shorthand.toUpperCase(), m);
  let added = 0;
  let skipped = 0;
  for (const m of incoming) {
    const key = m.shorthand.toUpperCase();
    if (bySh.has(key)) {
      skipped++;
    } else {
      added++;
      bySh.set(key, m);
    }
  }
  return { list: Array.from(bySh.values()), added, skipped };
}

// storage.saveTransactions is not exported; write directly via key
// This mirrors storage.ts internals and is used only by import.
function saveTransactionsDirect(txns: Transaction[]): void {
  localStorage.setItem("bujit_transactions", JSON.stringify(txns));
}

// ---------------------------------------------------------------------------
// Checksum
// ---------------------------------------------------------------------------

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    // Ensure we pass a plain ArrayBuffer (not a Uint8Array-backed shared buffer type)
    const copy = new Uint8Array(bytes);
    const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback: tiny non-crypto fingerprint (still catches most corruption)
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < bytes.length; i++) {
    h1 = Math.imul(h1 ^ bytes[i], 2654435761);
    h2 = Math.imul(h2 ^ bytes[i], 1597334677);
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") +
    (h2 >>> 0).toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Base64 helpers (browser-safe)
// ---------------------------------------------------------------------------

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunk, bytes.length))
    );
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}