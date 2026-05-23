import type { Transaction } from "@/lib/types";
import type { ReactElement } from "react";

type DashboardCardType = "stat" | "insight" | "chart";

export type DashboardCardId =
  | "spent"
  | "income"
  | "savings"
  | "this-week"
  | "daily-avg"
  | "avg-txn"
  | "no-expense-streak"
  | "spending-streak"
  | "active-days"
  | "most-frequent"
  | "biggest-expense"
  | "best-day"
  | "worst-day"
  | "daily-chart"
  | "top-categories"
  | "needs-wants"
  | "payment-mode"
  | "monthly-trend"
  | "last-month"
  | "goals"
  | "spending-heatmap";

export interface DashboardCardSpec {
  id: DashboardCardId;
  type: DashboardCardType;
  /** Whether this card should occupy the full row (2 columns) */
  fullWidth?: boolean;
  render: () => ReactElement | null;
}

export interface DashboardAnalytics {
  periodTotal: number;
  lastMonthTotal: number;
  periodIncomeTotal: number;
  percentChange: number;
  needsTotal: number;
  wantsTotal: number;
  uncategorized: number;
  savingsThisPeriod: number;
  savingsRate: number;
  thisWeekTotal: number;
  lastWeekTotal: number;
  weekChange: number;
  avgDailySpending: number;
  transactionCount: number;
  topCategories: { name: string; value: number }[];
  byMode: { name: string; value: number }[];
  dailyData: {
    day: string;
    expense: number;
    income: number;
    date: Date;
  }[];
  monthlyTrend: {
    month: string;
    expense: number;
    income: number;
    savings: number;
    monthStart: Date;
    monthEnd: Date;
  }[];
  biggestExpense: Transaction | null;
  mostFrequentCategory?: [string, number];
  avgTransactionSize: number;
  uniqueSpendingDays: number;
  streakDays: number;
  bestDay: [string, number] | null;
  worstDay: [string, number] | null;
  needsWantsRatio: number;
  pieData: { name: string; value: number; color: string }[];
}
