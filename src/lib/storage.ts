import {
  Transaction,
  PaymentMode,
  AppSettings,
  DashboardCard,
  DashboardLayout,
} from "./types";

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

// Google Sheets sync configuration
const GOOGLE_SHEETS_CONFIG_KEY = "bujit_google_sheets_config";

export interface GoogleSheetsConfig {
  accessToken: string;
  refreshToken?: string;
  sheetId: string;
  autoSync: boolean;
  lastSyncTimestamp?: number;
}

export function getGoogleSheetsConfig(): GoogleSheetsConfig | null {
  try {
    const data = localStorage.getItem(GOOGLE_SHEETS_CONFIG_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveGoogleSheetsConfig(
  config: GoogleSheetsConfig | null
): void {
  if (config) {
    localStorage.setItem(GOOGLE_SHEETS_CONFIG_KEY, JSON.stringify(config));
  } else {
    localStorage.removeItem(GOOGLE_SHEETS_CONFIG_KEY);
  }
}

// Dashboard layout configuration
const DASHBOARD_LAYOUT_KEY = "bujit_dashboard_layout";
const DASHBOARD_LAYOUT_EVENT = "bujit:dashboard-layout-changed";

// Default card order matching current Dashboard structure
const DEFAULT_DASHBOARD_CARDS: DashboardCard[] = [
  { id: "spent", type: "stat", order: 0, visible: true },
  { id: "income", type: "stat", order: 1, visible: true },
  { id: "savings", type: "stat", order: 2, visible: true },
  { id: "this-week", type: "stat", order: 3, visible: true },
  { id: "daily-avg", type: "stat", order: 4, visible: true },
  { id: "avg-txn", type: "insight", order: 5, visible: true },
  { id: "no-expense-streak", type: "insight", order: 6, visible: true },
  { id: "spending-streak", type: "insight", order: 7, visible: true },
  { id: "active-days", type: "insight", order: 8, visible: true },
  { id: "most-frequent", type: "insight", order: 9, visible: true },
  { id: "biggest-expense", type: "insight", order: 10, visible: true },
  { id: "best-day", type: "insight", order: 11, visible: true },
  { id: "worst-day", type: "insight", order: 12, visible: true },
  { id: "daily-chart", type: "chart", order: 13, visible: true },
  { id: "top-categories", type: "chart", order: 14, visible: true },
  { id: "needs-wants", type: "chart", order: 15, visible: true },
  { id: "payment-mode", type: "chart", order: 16, visible: true },
  { id: "monthly-trend", type: "chart", order: 17, visible: true },
  { id: "last-month", type: "stat", order: 18, visible: true },
];

function notifyDashboardLayoutChanged() {
  // In SSR/tests `window` may not exist.
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DASHBOARD_LAYOUT_EVENT));
}

function normalizeDashboardLayoutOrder(
  cards: DashboardCard[]
): DashboardCard[] {
  // Ensure a stable, gap-free order after merges/migrations.
  const sorted = [...cards].sort((a, b) => a.order - b.order);
  return sorted.map((c, idx) => ({ ...c, order: idx }));
}

export function getDashboardLayout(): DashboardCard[] {
  try {
    const data = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (!data) return DEFAULT_DASHBOARD_CARDS;

    const parsed: DashboardLayout = JSON.parse(data);
    if (!parsed.cards || !Array.isArray(parsed.cards)) {
      return DEFAULT_DASHBOARD_CARDS;
    }

    // Validate and merge with defaults (in case new cards were added)
    const savedIds = new Set(parsed.cards.map((c: DashboardCard) => c.id));
    const defaultCards = DEFAULT_DASHBOARD_CARDS.map((card) => {
      const saved = parsed.cards.find((c: DashboardCard) => c.id === card.id);
      return saved || card;
    });

    // Add any new default cards that weren't in saved layout
    DEFAULT_DASHBOARD_CARDS.forEach((card) => {
      if (!savedIds.has(card.id)) {
        defaultCards.push(card);
      }
    });

    return normalizeDashboardLayoutOrder(defaultCards);
  } catch (error) {
    console.error("Error loading dashboard layout:", error);
    return DEFAULT_DASHBOARD_CARDS;
  }
}

export function saveDashboardLayout(cards: DashboardCard[]): void {
  try {
    const layout: DashboardLayout = {
      cards: normalizeDashboardLayoutOrder(cards),
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout));
    notifyDashboardLayoutChanged();
  } catch (error) {
    console.error("Error saving dashboard layout:", error);
  }
}

export function resetDashboardLayout(): void {
  try {
    localStorage.removeItem(DASHBOARD_LAYOUT_KEY);
    notifyDashboardLayoutChanged();
  } catch (error) {
    console.error("Error resetting dashboard layout:", error);
  }
}
