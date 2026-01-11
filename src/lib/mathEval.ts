/**
 * Safe math expression evaluator
 * Allows basic arithmetic operations: +, -, *, /
 * Returns null for invalid expressions
 */

const MATH_EXPRESSION_REGEX = /^[\d\s+\-*/().]+$/;
const MAX_EXPRESSION_LENGTH = 50;

export function evaluateMathExpression(expr: string): number | null {
  const trimmed = expr.trim();

  // Empty string
  if (!trimmed) return null;

  // Check length limit
  if (trimmed.length > MAX_EXPRESSION_LENGTH) return null;

  // Only allow valid math characters
  if (!MATH_EXPRESSION_REGEX.test(trimmed)) return null;

  // Check for empty parentheses or invalid patterns
  if (/\(\s*\)/.test(trimmed)) return null;

  // Check for consecutive operators (except minus for negative numbers)
  if (/[+*/]{2,}|[+*/]-{2,}/.test(trimmed)) return null;

  try {
    // Use Function constructor for safe evaluation (no access to globals)
    // This is safer than eval() as it creates a new scope
    const result = new Function(`"use strict"; return (${trimmed})`)();

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
