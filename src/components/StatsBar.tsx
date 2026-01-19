import { useState } from "react";
import { formatAmount } from "@/lib/parser";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AppSettings } from "@/lib/types";
import { formatMaskedAmount } from "@/lib/privacy";

interface StatsBarProps {
  stats: {
    totalExpenses: number;
    totalIncome: number;
    needsTotal: number;
    wantsTotal: number;
    uncategorized: number;
    transactionCount: number;
  };
  currencySymbol: string;
  settings: AppSettings;
}

export function StatsBar({ stats, currencySymbol, settings }: StatsBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const needsPercent =
    stats.totalExpenses > 0
      ? (stats.needsTotal / stats.totalExpenses) * 100
      : 0;
  const wantsPercent =
    stats.totalExpenses > 0
      ? (stats.wantsTotal / stats.totalExpenses) * 100
      : 0;

  const balance = stats.totalIncome - stats.totalExpenses;

  return (
    <div className="flex flex-col gap-2">
      {/* Divider with Toggle Button */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border border-border/50 hover:border-border bg-muted/50 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:text-muted-foreground"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Hide Stats</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Show Stats</span>
            </>
          )}
        </button>
        <div className="flex-1 h-px bg-border" />
      </div>
      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-4 pb-3">
          {/* Balance */}
          <div className="text-center">
            <p
              className={cn(
                "text-3xl font-bold font-mono",
                balance >= 0 ? "text-income" : "text-expense"
              )}
            >
              {settings.privacyMode?.hideAmounts
                ? formatMaskedAmount(
                    Math.abs(balance),
                    settings,
                    currencySymbol
                  )
                : `${balance >= 0 ? "+" : ""}${currencySymbol}${formatAmount(Math.abs(balance))}`}
            </p>
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <span className="text-income">
                {settings.privacyMode?.hideAmounts
                  ? formatMaskedAmount(
                      stats.totalIncome,
                      settings,
                      currencySymbol
                    )
                  : `+${currencySymbol}${formatAmount(stats.totalIncome)}`}
              </span>
              <span className="text-expense">
                {settings.privacyMode?.hideAmounts
                  ? formatMaskedAmount(
                      stats.totalExpenses,
                      settings,
                      currencySymbol
                    )
                  : `-${currencySymbol}${formatAmount(stats.totalExpenses)}`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.transactionCount} transactions
            </p>
          </div>

          {/* Needs vs Wants Progress Bar */}
          {stats.totalExpenses > 0 && (
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-need transition-all duration-500"
                  style={{ width: `${needsPercent}%` }}
                />
                <div
                  className="h-full bg-want transition-all duration-500"
                  style={{ width: `${wantsPercent}%` }}
                />
              </div>

              {/* Legend */}
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-need" />
                    <span className="text-muted-foreground">Needs</span>
                    <span
                      className={cn(
                        "font-mono font-medium",
                        stats.needsTotal > 0 && "text-need"
                      )}
                    >
                      {settings.privacyMode?.hideAmounts
                        ? formatMaskedAmount(
                            stats.needsTotal,
                            settings,
                            currencySymbol
                          )
                        : `${currencySymbol}${formatAmount(stats.needsTotal)}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-want" />
                    <span className="text-muted-foreground">Wants</span>
                    <span
                      className={cn(
                        "font-mono font-medium",
                        stats.wantsTotal > 0 && "text-want"
                      )}
                    >
                      {settings.privacyMode?.hideAmounts
                        ? formatMaskedAmount(
                            stats.wantsTotal,
                            settings,
                            currencySymbol
                          )
                        : `${currencySymbol}${formatAmount(stats.wantsTotal)}`}
                    </span>
                  </span>
                </div>
                {stats.uncategorized > 0 && (
                  <span className="text-muted-foreground">
                    {settings.privacyMode?.hideAmounts
                      ? formatMaskedAmount(
                          stats.uncategorized,
                          settings,
                          currencySymbol
                        )
                      : `${currencySymbol}${formatAmount(stats.uncategorized)}`}{" "}
                    uncategorized
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
