/**
 * Safe math expression evaluator
 * Allows basic arithmetic operations: +, -, *, /
 * Returns null for invalid expressions
 */

const MATH_EXPRESSION_REGEX = /^[\d\s+\-*/().%]+$/;
const MAX_EXPRESSION_LENGTH = 50;

/**
 * Expand percent shorthand patterns into explicit arithmetic.
 * Examples:
 *   "2400+10%"  -> "2400+(2400*10/100)"
 *   "850-15%"   -> "850-(850*15/100)"
 *   "100+5%+2%" -> applied left-to-right; each % uses the running base before it
 * A "%" not preceded by `+`/`-` after a number is rejected (returns input as-is,
 * letting the strict regex below fail it).
 */
function expandPercentShorthand(expr: string): string {
  // Match: <base><op:+|-><pct>% where base/pct can be decimals or parenthesised
  // We repeatedly apply the leftmost match so chained "+5%-2%" works.
  const PCT_RE = /(\d+(?:\.\d+)?|\([^()]*\))\s*([+\-])\s*(\d+(?:\.\d+)?)%/;
  let out = expr;
  // Cap iterations to avoid pathological loops.
  for (let i = 0; i < 10; i++) {
    const next = out.replace(
      PCT_RE,
      (_m, base: string, op: string, pct: string) =>
        `(${base}${op}(${base}*${pct}/100))`
    );
    if (next === out) break;
    out = next;
  }
  return out;
}

export function evaluateMathExpression(expr: string): number | null {
  const trimmed = expr.trim();

  // Empty string
  if (!trimmed) return null;

  // Check length limit
  if (trimmed.length > MAX_EXPRESSION_LENGTH) return null;

  // Only allow valid math characters (incl. %)
  if (!MATH_EXPRESSION_REGEX.test(trimmed)) return null;

  // Expand percent shorthand into plain arithmetic, then strip any leftover %.
  // If a % remains after expansion (e.g. malformed like "%50"), reject.
  const expanded = expandPercentShorthand(trimmed);
  if (expanded.includes("%")) return null;

  // Check for empty parentheses or invalid patterns
  if (/\(\s*\)/.test(expanded)) return null;

  // Check for consecutive operators (except minus for negative numbers).
  // Use the original (pre-expansion) string so we don't false-trigger on
  // generated parens like "+(base*pct/100)".
  if (/[+*/]{2,}|[+*/]-{2,}/.test(trimmed)) return null;

  try {
    // Use Function constructor for safe evaluation (no access to globals)
    // This is safer than eval() as it creates a new scope
    const result = new Function(`"use strict"; return (${expanded})`)();

    // Validate result
    if (typeof result !== "number" || !isFinite(result)) return null;

    // Reject negative values
    if (result <= 0) return null;

    // Round to avoid floating point issues (max 2 decimal places)
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

/**
 * Check if expression contains operators (to show preview)
 */
export function hasOperators(expr: string): boolean {
  return /[+\-*/]/.test(expr.trim());
}

/**
 * Format the evaluated result for display
 */
export function formatEvaluatedAmount(
  amount: number,
  currencySymbol: string
): string {
  return `${currencySymbol}${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount)}`;
}
