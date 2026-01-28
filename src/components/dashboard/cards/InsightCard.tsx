import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle: string;
  iconClassName?: string;
  valueClassName?: string;
  onLabelClick?: () => void;
}

export function InsightCard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconClassName,
  valueClassName = "text-foreground",
  onLabelClick,
}: InsightCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
        <Icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0", iconClassName)} />
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
      <p className={cn("text-base sm:text-xl font-bold font-mono", valueClassName)}>
        {value}
      </p>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
        {subtitle}
      </p>
    </div>
  );
}
