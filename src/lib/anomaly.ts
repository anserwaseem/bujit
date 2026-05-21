import type { Transaction } from "./types";

const LOOKBACK_DAYS = 90;
const MIN_SAMPLE_SIZE = 5;
const STDDEV_THRESHOLD = 2; // top ~2.5%

export interface AnomalyResult {
  isAnomalous: boolean;
  mean: number;
  factor: number; // amount / mean
  sampleSize: number;
  reason: string;
  paymentMode: string;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Detect whether a candidate expense amount is unusually high for the
 * given reason + payment mode combination, based on the last 90 days.
 *
 * Returns null when there isn't enough history to make a confident call.
 */
export function detectAnomaly(
  candidate: { reason: string; paymentMode: string; amount: number },
  history: Transaction[],
  now: Date = new Date()
): AnomalyResult | null {
  if (!candidate.reason || candidate.amount <= 0) return null;

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

  const reasonKey = normalize(candidate.reason);
  const modeKey = normalize(candidate.paymentMode);

  const matches = history.filter(
    (t) =>
      t.type === "expense" &&
      normalize(t.reason) === reasonKey &&
      normalize(t.paymentMode) === modeKey &&
      new Date(t.date) >= cutoff
  );

  if (matches.length < MIN_SAMPLE_SIZE) return null;

  const amounts = matches.map((t) => t.amount);
  const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const variance =
    amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
  const stddev = Math.sqrt(variance);

  const threshold = mean + STDDEV_THRESHOLD * stddev;
  const isAnomalous = candidate.amount > threshold && candidate.amount > mean;

  return {
    isAnomalous,
    mean,
    factor: candidate.amount / mean,
    sampleSize: matches.length,
    reason: candidate.reason,
    paymentMode: candidate.paymentMode,
  };
}