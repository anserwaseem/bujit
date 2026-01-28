import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  valueClassName?: string;
  subtitle?: ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  onLabelClick?: () => void;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  valueClassName,
  subtitle,
  trend,
  onLabelClick,
}: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
        <span
          onClick={onLabelClick}
          className={cn(
            "text-[10px] sm:text-xs uppercase tracking-wider",
            onLabelClick &&
              "cursor-pointer hover:text-foreground active:text-foreground active:opacity-70 transition-colors select-none py-0.5 -my-0.5 px-1 -mx-1 rounded"
          )}
        >
          {label}
        </span>
      </div>
      <p
        className={cn(
          "text-base sm:text-xl font-bold font-mono truncate",
          valueClassName
        )}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
          {subtitle}
        </p>
      )}
      {trend && (
        <div
          className={cn(
            "flex items-center gap-1 text-[10px] sm:text-xs mt-1",
            trend.isPositive ? "text-income" : "text-expense"
          )}
        >
          {trend.isPositive ? (
            <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
          ) : (
            <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
          )}
          <span className="truncate">
            {Math.abs(trend.value).toFixed(0)}% {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}
