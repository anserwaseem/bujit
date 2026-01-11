import { ParsedInput, PaymentMode } from "./types";
import { evaluateMathExpression } from "./mathEval";

const DEFAULT_MODE = "Cash";

// Regex to detect math expressions (contains operators)
const MATH_OPERATORS_REGEX = /[+\-*/]/;

export function parseInput(input: string, modes: PaymentMode[]): ParsedInput {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      reason: "",
      paymentMode: DEFAULT_MODE,
      amount: null,
      isValid: false,
    };
  }

  const parts = trimmed.split(/\s+/);

  if (parts.length < 2) {
    return {
      reason: trimmed,
      paymentMode: DEFAULT_MODE,
      amount: null,
      isValid: false,
    };
  }

  // Last part should be the amount (could be a math expression like "100+50")
  const lastPart = parts[parts.length - 1];

  let amount: number | null;

  // Check if it's a math expression
  if (MATH_OPERATORS_REGEX.test(lastPart)) {
    amount = evaluateMathExpression(lastPart);
  } else {
    const parsed = parseFloat(lastPart.replace(/,/g, ""));
    amount = isNaN(parsed) || parsed <= 0 ? null : parsed;
  }

  if (amount === null) {
    return {
      reason: trimmed,
      paymentMode: DEFAULT_MODE,
      amount: null,
      isValid: false,
    };
  }

  // Check if second-to-last matches a payment mode
  let paymentMode = DEFAULT_MODE;
  let reasonParts = parts.slice(0, -1);

  if (parts.length >= 3) {
    const potentialMode = parts[parts.length - 2].toUpperCase();
    const matchedMode = modes.find(
      (m) =>
        m.shorthand.toUpperCase() === potentialMode ||
        m.name.toUpperCase() === potentialMode
    );

    if (matchedMode) {
      paymentMode = matchedMode.name;
      reasonParts = parts.slice(0, -2);
    }
  }

  const reason = reasonParts.join(" ");

  return {
    reason: reason || "Unknown",
    paymentMode,
    amount,
    isValid: reason.length > 0 && amount > 0,
  };
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string, includeYear: boolean = false): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  };
  if (includeYear) {
    options.year = "numeric";
  }
  return date.toLocaleDateString("en-US", options);
}

export function getRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if date is from a different year
  const isCurrentYear = date.getFullYear() === today.getFullYear();

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  // Include year only if it's not the current year
  return formatDate(dateStr, !isCurrentYear);
}
