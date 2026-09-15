import { format, isSameDay, subDays } from "date-fns";

export function formatTransactionTime(date: string | Date): string {
  return format(new Date(date), "h:mm a");
}

export function formatCompactTransactionDateTime(date: Date): string {
  const now = new Date();
  const dayLabel = isSameDay(date, now)
    ? "Today"
    : isSameDay(date, subDays(now, 1))
      ? "Yesterday"
      : format(date, "MMM d");

  return `${dayLabel} · ${formatTransactionTime(date)}`;
}

export function toTimeInputValue(date: Date): string {
  return format(date, "HH:mm");
}

export function combineDateAndTime(date: Date, timeSource: Date): Date {
  const combined = new Date(date);
  combined.setHours(
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    timeSource.getMilliseconds()
  );
  return combined;
}

export function setTimeOnDate(date: Date, time: string): Date {
  const [hoursText, minutesText] = time.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return date;

  const updated = new Date(date);
  updated.setHours(hours, minutes, 0, 0);
  return updated;
}

export function sortTransactionsNewest<T extends { date: string }>(
  transactions: T[]
): T[] {
  return [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}