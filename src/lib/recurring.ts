import { format } from "date-fns";
import type { RecurringCadence, RecurringRule, Transaction } from "./types";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number, dayOfMonth?: number): Date {
  const x = new Date(d);
  x.setDate(1);
  x.setMonth(x.getMonth() + n);
  const targetDay = dayOfMonth ?? d.getDate();
  const lastDay = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(targetDay, lastDay));
  return x;
}

function monthlyDateInMonth(year: number, month: number, dayOfMonth: number): Date {
  const x = startOfDay(new Date(year, month, 1));
  const lastDay = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(dayOfMonth, lastDay));
  return x;
}

/** First monthly occurrence on or after `from`, aligned to `dayOfMonth`. */
export function monthlyStartDate(
  dayOfMonth: number,
  from: Date = new Date()
): Date {
  const today = startOfDay(from);
  const thisMonth = monthlyDateInMonth(
    today.getFullYear(),
    today.getMonth(),
    dayOfMonth
  );
  if (thisMonth >= today) return thisMonth;
  return addMonths(thisMonth, 1, dayOfMonth);
}

function firstMonthlyFireDate(rule: RecurringRule): Date {
  const anchor = startOfDay(new Date(rule.startDate));
  if (!rule.dayOfMonth) return anchor;
  return monthlyDateInMonth(
    anchor.getFullYear(),
    anchor.getMonth(),
    rule.dayOfMonth
  );
}

/** Compute the next firing date for a rule given its last (or start) date. */
export function nextFireDate(rule: RecurringRule): Date {
  const base = startOfDay(
    new Date(rule.lastFiredDate ?? rule.startDate)
  );
  switch (rule.cadence) {
    case "daily":
      return rule.lastFiredDate ? addDays(base, 1) : base;
    case "weekly":
      return rule.lastFiredDate ? addDays(base, 7) : base;
    case "monthly":
      if (!rule.lastFiredDate) return firstMonthlyFireDate(rule);
      return addMonths(base, 1, rule.dayOfMonth);
    case "yearly": {
      if (!rule.lastFiredDate) return base;
      const x = new Date(base);
      x.setFullYear(x.getFullYear() + 1);
      return x;
    }
  }
}

export function describeRecurringSchedule(rule: RecurringRule): string {
  const start = startOfDay(new Date(rule.startDate));
  switch (rule.cadence) {
    case "daily":
      return `Every day from ${format(start, "MMM d, yyyy")}`;
    case "weekly":
      return `Every ${format(start, "EEEE")}`;
    case "monthly":
      return rule.dayOfMonth
        ? `Day ${rule.dayOfMonth} of each month`
        : "Monthly";
    case "yearly":
      return `Every ${format(start, "MMM d")}`;
  }
}

export function scheduleHint(cadence: RecurringCadence, startDate: string): string {
  const start = startOfDay(new Date(startDate));
  switch (cadence) {
    case "daily":
      return "Creates a transaction every day from this date.";
    case "weekly":
      return `Repeats every ${format(start, "EEEE")}.`;
    case "monthly":
      return "Creates a transaction on this day every month.";
    case "yearly":
      return `Repeats every year on ${format(start, "MMM d")}.`;
  }
}

/**
 * Process all due recurring rules, producing transactions to insert and
 * updated rules (with refreshed `lastFiredDate`). Idempotent: a rule whose
 * next fire date is in the future returns no transactions.
 */
export function processDueRecurring(
  rules: RecurringRule[],
  now: Date = new Date()
): { newTransactions: Omit<Transaction, "id">[]; updatedRules: RecurringRule[] } {
  const today = startOfDay(now);
  const newTransactions: Omit<Transaction, "id">[] = [];
  const updatedRules: RecurringRule[] = rules.map((rule) => {
    if (!rule.active) return rule;

    let next = nextFireDate(rule);
    let last = rule.lastFiredDate;
    // Catch up — fire once per missed period.
    while (next <= today) {
      newTransactions.push({
        ...rule.template,
        date: next.toISOString(),
      });
      last = next.toISOString();
      next = nextFireDate({ ...rule, lastFiredDate: last });
    }
    return last === rule.lastFiredDate ? rule : { ...rule, lastFiredDate: last };
  });
  return { newTransactions, updatedRules };
}