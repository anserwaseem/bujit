import { formatAmount } from '@/lib/parser';
import { cn } from '@/lib/utils';

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
}

export function StatsBar({ stats, currencySymbol }: StatsBarProps) {
  const needsPercent = stats.totalExpenses > 0 
    ? (stats.needsTotal / stats.totalExpenses) * 100 
    : 0;
  const wantsPercent = stats.totalExpenses > 0 
    ? (stats.wantsTotal / stats.totalExpenses) * 100 
    : 0;

  const balance = stats.totalIncome - stats.totalExpenses;

  return (
    <div className="space-y-4">
      {/* Balance */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
          This Month
        </p>
        <p className={cn(
          "text-3xl font-bold font-mono",
          balance >= 0 ? "text-income" : "text-expense"
        )}>
          {balance >= 0 ? '+' : ''}{currencySymbol}{formatAmount(Math.abs(balance))}
        </p>
        <div className="flex justify-center gap-4 mt-2 text-xs">
          <span className="text-income">+{currencySymbol}{formatAmount(stats.totalIncome)}</span>
          <span className="text-expense">-{currencySymbol}{formatAmount(stats.totalExpenses)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {stats.transactionCount} transactions
        </p>
      </div>

      {/* Progress Bar */}
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
                <span className={cn("font-mono font-medium", stats.needsTotal > 0 && "text-need")}>
                  {currencySymbol}{formatAmount(stats.needsTotal)}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-want" />
                <span className="text-muted-foreground">Wants</span>
                <span className={cn("font-mono font-medium", stats.wantsTotal > 0 && "text-want")}>
                  {currencySymbol}{formatAmount(stats.wantsTotal)}
                </span>
              </span>
            </div>
            {stats.uncategorized > 0 && (
              <span className="text-muted-foreground">
                {currencySymbol}{formatAmount(stats.uncategorized)} uncategorized
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}