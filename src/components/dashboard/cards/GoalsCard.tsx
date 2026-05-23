import { Target, ChevronRight, Plus } from "lucide-react";
import { cn, haptic } from "@/lib/utils";
import type { GoalProgress } from "@/lib/goals";

interface GoalsCardProps {
  goalsProgress: GoalProgress[];
  currencySymbol: string;
  formatAmount: (n: number) => string;
  onOpenGoals: () => void;
}

const KIND_LABEL: Record<string, string> = {
  savings: "Saving",
  owe: "Owe",
  owed: "Owed",
};

const KIND_COLOR: Record<string, string> = {
  savings: "text-income",
  owe: "text-expense",
  owed: "text-want",
};

function ProgressRing({ percent, kind }: { percent: number; kind: string }) {
  const R = 14;
  const C = 2 * Math.PI * R;
  const offset = C - (Math.max(0, Math.min(100, percent)) / 100) * C;
  const stroke =
    kind === "savings"
      ? "hsl(var(--income))"
      : kind === "owe"
        ? "hsl(var(--expense))"
        : "hsl(var(--want))";
  return (
    <svg width={36} height={36} className="-rotate-90 flex-shrink-0">
      <circle cx={18} cy={18} r={R} stroke="hsl(var(--muted))" strokeWidth={3} fill="none" />
      <circle
        cx={18}
        cy={18}
        r={R}
        stroke={stroke}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

export function GoalsCard({
  goalsProgress,
  currencySymbol,
  formatAmount,
  onOpenGoals,
}: GoalsCardProps) {
  const visible = goalsProgress.slice(0, 3);

  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
      <button
        onClick={() => {
          haptic("light");
          onOpenGoals();
        }}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Goals
          </h3>
          {goalsProgress.length > 0 && (
            <span className="text-[10px] text-muted-foreground/70">
              {goalsProgress.length}
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>

      {visible.length === 0 ? (
        <button
          onClick={() => {
            haptic("light");
            onOpenGoals();
          }}
          className="w-full flex items-center justify-center gap-1.5 py-4 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add a goal
        </button>
      ) : (
        <div className="space-y-2.5">
          {visible.map((gp) => (
            <button
              key={gp.goal.id}
              onClick={() => {
                haptic("light");
                onOpenGoals();
              }}
              className="w-full flex items-center gap-3 text-left"
            >
              <ProgressRing percent={gp.percent} kind={gp.goal.kind} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{gp.goal.name}</p>
                <p
                  className={cn(
                    "text-[10px] uppercase tracking-wider",
                    KIND_COLOR[gp.goal.kind]
                  )}
                >
                  {KIND_LABEL[gp.goal.kind]}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-mono font-semibold">
                  {currencySymbol}
                  {formatAmount(gp.current)}
                  {gp.target !== undefined && (
                    <span className="text-muted-foreground font-normal">
                      {" / "}
                      {formatAmount(gp.target)}
                    </span>
                  )}
                </p>
                {gp.target !== undefined && (
                  <p className="text-[10px] text-muted-foreground">
                    {gp.percent.toFixed(0)}%
                  </p>
                )}
              </div>
            </button>
          ))}
          {goalsProgress.length > visible.length && (
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              + {goalsProgress.length - visible.length} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}