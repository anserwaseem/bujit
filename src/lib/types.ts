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
