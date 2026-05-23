import { useMemo, useState } from "react";
import { format, startOfDay, endOfDay, subDays, subMonths, startOfWeek } from "date-fns";
import { CalendarDays } from "lucide-react";
import { cn, haptic } from "@/lib/utils";
import type { Transaction } from "@/lib/types";
import type { AdditionalFilterCriteria } from "@/components/FilteredTransactionsDialog";

interface SpendingHeatmapProps {
  transactions: Transaction[]; // unfiltered all-time
  onOpenFilteredTransactions: (
    additionalFilter: AdditionalFilterCriteria,
    title: string
  ) => void;
}

type Range = "year" | "3m";

const CELL = 11;
const GAP = 2;

export function SpendingHeatmap({
  transactions,
  onOpenFilteredTransactions,
}: SpendingHeatmapProps) {
  const [range, setRange] = useState<Range>("year");

  const { weeks, max, weekCount } = useMemo(() => {
    const today = startOfDay(new Date());
    const totalDays = range === "year" ? 365 : 90;
    const start = startOfWeek(subDays(today, totalDays - 1), { weekStartsOn: 0 });

    // sum expense by day
    const byDay: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const d = startOfDay(new Date(t.date));
      if (d < start || d > today) continue;
      const key = d.toDateString();
      byDay[key] = (byDay[key] || 0) + t.amount;
    }

    const cells: { date: Date; amount: number }[] = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const key = cursor.toDateString();
      cells.push({ date: new Date(cursor), amount: byDay[key] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    const wks: { date: Date; amount: number }[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      wks.push(cells.slice(i, i + 7));
    }
    const maxAmt = cells.reduce((m, c) => Math.max(m, c.amount), 0);
    return { weeks: wks, max: maxAmt, weekCount: wks.length };
  }, [transactions, range]);

  const bucket = (amount: number): number => {
    if (amount <= 0 || max <= 0) return 0;
    const ratio = amount / max;
    if (ratio < 0.2) return 1;
    if (ratio < 0.4) return 2;
    if (ratio < 0.6) return 3;
    if (ratio < 0.8) return 4;
    return 5;
  };

  const alphaFor = (b: number) =>
    b === 0 ? 0.08 : 0.18 + (b - 1) * 0.18;

  const handleCellClick = (date: Date) => {
    haptic("light");
    onOpenFilteredTransactions(
      { dateRange: { start: startOfDay(date), end: endOfDay(date) } },
      `Spending - ${format(date, "MMM d, yyyy")}`
    );
  };

  const width = weekCount * (CELL + GAP);
  const height = 7 * (CELL + GAP);

  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
            Spending Heatmap
          </h3>
          <span className="text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/70 font-medium">
            All Time
          </span>
        </div>
        <div className="flex rounded-full bg-muted p-0.5">
          {(["3m", "year"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => {
                haptic("light");
                setRange(r);
              }}
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-medium transition-all",
                range === r
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {r === "3m" ? "3M" : "1Y"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4">
        <svg
          width={width}
          height={height}
          className="block"
          role="img"
          aria-label="Spending heatmap"
        >
          {weeks.map((week, wi) =>
            week.map((cell, di) => {
              const b = bucket(cell.amount);
              return (
                <rect
                  key={`${wi}-${di}`}
                  x={wi * (CELL + GAP)}
                  y={di * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  ry={2}
                  className="cursor-pointer"
                  fill={`hsl(var(--expense) / ${alphaFor(b)})`}
                  onClick={() => handleCellClick(cell.date)}
                >
                  <title>{`${format(cell.date, "MMM d, yyyy")} — ${cell.amount.toLocaleString("en-PK")}`}</title>
                </rect>
              );
            })
          )}
        </svg>
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3, 4, 5].map((b) => (
          <span
            key={b}
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ background: `hsl(var(--expense) / ${alphaFor(b)})` }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}