export type TransactionType = "expense" | "income" | "savings";
export type NecessityType = "need" | "want" | null;

export interface Transaction {
  id: string;
  date: string;
  reason: string;
  amount: number;
  paymentMode: string;
  type: TransactionType;
  necessity: NecessityType;
  /** Optional link to a Goal (savings/owe/owed). Backward compatible. */
  goalId?: string;
}

export interface PaymentMode {
  id: string;
  name: string;
  shorthand: string;
}

export interface ParsedInput {
  reason: string;
  paymentMode: string;
  amount: number | null;
  isValid: boolean;
}

export interface AppSettings {
  currency: string;
  currencySymbol: string;
  privacyMode?: {
    hideAmounts: boolean;
    hideReasons: boolean;
  };
}

export interface StreakData {
  noExpenseStreak: number; // consecutive days without expenses
  spendingStreak: number; // consecutive days with expenses
  lastNoExpenseDate: string | null; // ISO date string
  lastSpendingDate: string | null; // ISO date string
}

export interface DashboardCard {
  id: string;
  type: "stat" | "chart" | "insight";
  order: number;
  visible: boolean;
}

export interface DashboardLayout {
  cards: DashboardCard[];
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Goals — unified savings / owe / owed
// ---------------------------------------------------------------------------
// Path A philosophy: we do NOT introduce a "transfer" TransactionType. Every
// goal is just a long-running pot whose progress is derived from the user's
// normal income/expense entries that opt-in by carrying `goalId`. This keeps
// the data model and existing analytics untouched, while still letting users
// track debts, loans, sinking funds, and savings targets.

export type GoalKind = "savings" | "owe" | "owed";

export interface Goal {
  id: string;
  name: string;
  kind: GoalKind;
  target?: number;
  counterparty?: string;
  dueDate?: string;
  createdAt: string;
  archived?: boolean;
}

// ---------------------------------------------------------------------------
// Recurring transactions
// ---------------------------------------------------------------------------
export type RecurringCadence = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurringRule {
  id: string;
  template: Omit<Transaction, "id" | "date">;
  cadence: RecurringCadence;
  /** For monthly: day-of-month (1..31, clamped). */
  dayOfMonth?: number;
  startDate: string;
  lastFiredDate?: string;
  active: boolean;
}
