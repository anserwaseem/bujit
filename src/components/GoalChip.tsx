import { useState } from "react";
import { Target, X } from "lucide-react";
import type { Goal } from "@/lib/types";
import { cn, haptic } from "@/lib/utils";

interface GoalChipProps {
  goals: Goal[]; // active (non-archived) only
  selectedGoalId: string | undefined;
  onSelect: (goalId: string | undefined) => void;
}

const KIND_COLOR: Record<string, string> = {
  savings: "text-income",
  owe: "text-expense",
  owed: "text-want",
};

export function GoalChip({ goals, selectedGoalId, onSelect }: GoalChipProps) {
  const [open, setOpen] = useState(false);
  if (goals.length === 0) return null;

  const selected = goals.find((g) => g.id === selectedGoalId);

  return (
    <div className="relative">
      {selected ? (
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/30"
          )}
        >
          <Target className="w-3 h-3" />
          <span className="truncate max-w-[160px]">{selected.name}</span>
          <button
            onClick={() => {
              haptic("light");
              onSelect(undefined);
            }}
            aria-label="Remove goal tag"
            className="-mr-1"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            haptic("light");
            setOpen((o) => !o);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Target className="w-3 h-3" />
          Tag goal
        </button>
      )}

      {open && !selected && (
        <div className="absolute z-40 mt-1 right-0 w-56 bg-popover border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in">
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                haptic("light");
                onSelect(g.id);
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
            >
              <Target className={cn("w-3.5 h-3.5", KIND_COLOR[g.kind])} />
              <span className="truncate flex-1">{g.name}</span>
              <span className="text-[10px] uppercase text-muted-foreground">
                {g.kind}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}