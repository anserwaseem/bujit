import { Transaction, PaymentMode, AppSettings } from "./types";

const TRANSACTIONS_KEY = "bujit_transactions";
const MODES_KEY = "bujit_payment_modes";
const THEME_KEY = "bujit_theme";
const SETTINGS_KEY = "bujit_settings";

const DEFAULT_MODES: PaymentMode[] = [
  { id: "1", name: "Debit Card", shorthand: "D" },
  { id: "2", name: "Cash", shorthand: "C" },
  { id: "3", name: "Credit Card", shorthand: "CC" },
];

const DEFAULT_SETTINGS: AppSettings = {
  currency: "PKR",
  currencySymbol: "Rs.",
};

export function getTransactions(): Transaction[] {
  try {
    const data = localStorage.getItem(TRANSACTIONS_KEY);
    if (!data) return [];

    const parsed = JSON.parse(data);
    // validate it's an array
    if (!Array.isArray(parsed)) {
      console.warn("Invalid transactions data, resetting to empty array");
      saveTransactions([]);
      return [];
    }

    // basic validation - filter out invalid entries
    return parsed.filter(
      (t): t is Transaction =>
        t &&
        typeof t === "object" &&
        typeof t.id === "string" &&
        typeof t.amount === "number" &&
        typeof t.date === "string"
    );
  } catch (error) {
    console.error("Error loading transactions:", error);
    // if corrupted, clear and return empty
    try {
      localStorage.removeItem(TRANSACTIONS_KEY);
    } catch {
      // ignore cleanup errors
    }
    return [];
  }
}

function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (error) {
    // handle quota exceeded or other storage errors
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.error("Storage quota exceeded. Consider exporting old data.");
      throw new Error(
        "Storage is full. Please export and delete some old transactions."
      );
    }
    throw error;
  }
}

export function addTransaction(transaction: Transaction): Transaction[] {
  const transactions = getTransactions();
  const updated = [transaction, ...transactions];
  saveTransactions(updated);
  return updated;
}

export function deleteTransaction(id: string): Transaction[] {
  const transactions = getTransactions();
  const updated = transactions.filter((t) => t.id !== id);
  saveTransactions(updated);
  return updated;
}

export function updateTransaction(
  id: string,
  updates: Partial<Transaction>
): Transaction[] {
  const transactions = getTransactions();
  const updated = transactions.map((t) =>
    t.id === id ? { ...t, ...updates } : t
  );
  saveTransactions(updated);
  return updated;
}

export function getPaymentModes(): PaymentMode[] {
  try {
    const data = localStorage.getItem(MODES_KEY);
    return data ? JSON.parse(data) : DEFAULT_MODES;
  } catch {
    return DEFAULT_MODES;
  }
}

export function savePaymentModes(modes: PaymentMode[]): void {
  localStorage.setItem(MODES_KEY, JSON.stringify(modes));
}

export function getTheme(): "light" | "dark" {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    return theme === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function saveTheme(theme: "light" | "dark"): void {
  localStorage.setItem(THEME_KEY, theme);
}

export function getSettings(): AppSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
