import { useMemo, useState } from "react";
import { X, Plus, Archive, Trash2, Pencil, Target, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import type { Goal, GoalKind, Transaction, AppSettings } from "@/lib/types";
import { computeAllGoalsProgress } from "@/lib/goals";
import { cn, haptic } from "@/lib/utils";
import { formatMaskedAmount } from "@/lib/privacy";

interface GoalsScreenProps {
  goals: Goal[];
  transactions: Transaction[];
  currencySymbol: string;
  settings: AppSettings;
  onAddGoal: (goal: Omit<Goal, "id" | "createdAt">) => Goal;
  onUpdateGoal: (id: string, updates: Partial<Goal>) => void;
  onDeleteGoal: (id: string) => void;
  onArchiveGoal: (id: string, archived?: boolean) => void;
  onClose: () => void;
}

const KIND_OPTIONS: { value: GoalKind; label: string; hint: string }[] = [
  { value: "savings", label: "Savings", hint: "Accumulate funds" },
  { value: "owe", label: "Owe", hint: "Debt to pay off" },
  { value: "owed", label: "Owed", hint: "Money owed to you" },
];

const KIND_COLOR: Record<GoalKind, string> = {
  savings: "text-income",
  owe: "text-expense",
  owed: "text-want",
};

type Filter = "all" | GoalKind;

function fmt(n: number, settings: AppSettings, sym: string) {
  return formatMaskedAmount(
    n,
    { ...settings, privacyMode: { ...settings.privacyMode, hideAmounts: false } },
    sym
  );
}

export function GoalsScreen({
  goals,
  transactions,
  currencySymbol,
  settings,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onArchiveGoal,
  onClose,
}: GoalsScreenProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);
  const [openTimelineId, setOpenTimelineId] = useState<string | null>(null);

  const progress = useMemo(
    () => computeAllGoalsProgress(goals, transactions),
    [goals, transactions]
  );

  const filtered = progress.filter(
    (gp) => filter === "all" || gp.goal.kind === filter
  );

  return (
    <div className="fixed inset-0 z-50 bg-background animate-fade-in flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold flex items-center gap-2 flex-1">
          <Target className="w-5 h-5 text-primary" />
          Goals
        </h2>
        <button
          onClick={() => {
            haptic("light");
            setCreating(true);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 p-3 border-b border-border overflow-x-auto scrollbar-hide">
        {(["all", "savings", "owe", "owed"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => {
              haptic("light");
              setFilter(f);
            }}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors flex-shrink-0",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Target className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No goals yet</p>
            <p className="text-xs mt-1">
              Tap "Add" to track a savings goal, debt, or loan.
            </p>
          </div>
        ) : (
          filtered.map((gp) => {
            const linked = transactions
              .filter((t) => t.goalId === gp.goal.id)
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              );
            const open = openTimelineId === gp.goal.id;
            return (
              <div
                key={gp.goal.id}
                className={cn(
                  "bg-card border border-border rounded-xl p-3",
                  gp.goal.archived && "opacity-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{gp.goal.name}</p>
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-wider",
                          KIND_COLOR[gp.goal.kind]
                        )}
                      >
                        {gp.goal.kind}
                      </span>
                    </div>
                    {gp.goal.counterparty && (
                      <p className="text-xs text-muted-foreground truncate">
                        {gp.goal.counterparty}
                      </p>
                    )}
                    {gp.goal.dueDate && (
                      <p className="text-[10px] text-muted-foreground">
                        Due {format(new Date(gp.goal.dueDate), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold">
                      {fmt(gp.current, settings, currencySymbol)}
                    </p>
                    {gp.target !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        of {fmt(gp.target, settings, currencySymbol)}
                      </p>
                    )}
                  </div>
                </div>

                {gp.target !== undefined && (
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        gp.goal.kind === "savings" && "bg-income",
                        gp.goal.kind === "owe" && "bg-expense",
                        gp.goal.kind === "owed" && "bg-want"
                      )}
                      style={{ width: `${gp.percent}%` }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-1 mt-2 text-xs">
                  <button
                    onClick={() => {
                      haptic("light");
                      setOpenTimelineId(open ? null : gp.goal.id);
                    }}
                    className="px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    {gp.transactionCount} linked
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => setEditing(gp.goal)}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onArchiveGoal(gp.goal.id, !gp.goal.archived)}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="Archive"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete goal "${gp.goal.name}"?`))
                        onDeleteGoal(gp.goal.id);
                    }}
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-muted"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {open && (
                  <div className="mt-2 border-t border-border pt-2 space-y-1">
                    {linked.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        No transactions linked yet.
                      </p>
                    ) : (
                      linked.slice(0, 20).map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between text-xs py-1"
                        >
                          <span className="truncate">
                            {format(new Date(t.date), "MMM d")} · {t.reason}
                          </span>
                          <span
                            className={cn(
                              "font-mono",
                              t.type === "income"
                                ? "text-income"
                                : "text-expense"
                            )}
                          >
                            {t.type === "income" ? "+" : "−"}
                            {fmt(t.amount, settings, currencySymbol)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {(creating || editing) && (
        <GoalForm
          initial={editing ?? undefined}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={(data) => {
            if (editing) {
              onUpdateGoal(editing.id, data);
            } else {
              onAddGoal(data);
            }
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

interface GoalFormProps {
  initial?: Goal;
  onCancel: () => void;
  onSubmit: (data: Omit<Goal, "id" | "createdAt">) => void;
}

function GoalForm({ initial, onCancel, onSubmit }: GoalFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<GoalKind>(initial?.kind ?? "savings");
  const [target, setTarget] = useState(initial?.target?.toString() ?? "");
  const [counterparty, setCounterparty] = useState(initial?.counterparty ?? "");
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ? initial.dueDate.split("T")[0] : ""
  );

  const canSave = name.trim().length > 0 && (kind === "savings" || target);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">{initial ? "Edit Goal" : "New Goal"}</h3>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Kind
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {KIND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setKind(opt.value)}
                  className={cn(
                    "p-2 rounded-lg text-xs font-medium border transition-colors",
                    kind === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div>{opt.label}</div>
                  <div className="text-[9px] opacity-70 mt-0.5">{opt.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                kind === "savings"
                  ? "Zakat 2026"
                  : kind === "owe"
                    ? "Ali — borrowed"
                    : "Sara — lent"
              }
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Target {kind === "savings" && "(optional)"}
            </label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="50000"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {(kind === "owe" || kind === "owed") && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Counterparty (optional)
              </label>
              <input
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder="Name"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Due date (optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-border">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg font-medium bg-muted text-muted-foreground hover:bg-muted/80"
          >
            Cancel
          </button>
          <button
            disabled={!canSave}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                kind,
                target: target ? parseFloat(target) : undefined,
                counterparty: counterparty.trim() || undefined,
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
              })
            }
            className={cn(
              "flex-1 py-2.5 rounded-lg font-medium",
              canSave
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {initial ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}