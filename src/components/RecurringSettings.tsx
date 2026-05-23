import { useState } from "react";
import { Plus, Trash2, Pause, Play, Repeat, Pencil } from "lucide-react";
import type {
  Goal,
  PaymentMode,
  RecurringCadence,
  RecurringRule,
} from "@/lib/types";
import { cn, haptic } from "@/lib/utils";
import {
  describeRecurringSchedule,
  monthlyStartDate,
  nextFireDate,
  scheduleHint,
} from "@/lib/recurring";
import { GoalChip } from "@/components/GoalChip";
import { format } from "date-fns";

interface RecurringSettingsProps {
  rules: RecurringRule[];
  paymentModes: PaymentMode[];
  goals: Goal[];
  onAdd: (
    rule: Omit<RecurringRule, "id" | "active"> & { active?: boolean }
  ) => void;
  onUpdate: (id: string, updates: Partial<RecurringRule>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

const CADENCES: RecurringCadence[] = ["daily", "weekly", "monthly", "yearly"];

interface RecurringFormState {
  reason: string;
  amount: string;
  paymentMode: string;
  type: "expense" | "income";
  cadence: RecurringCadence;
  dayOfMonth: string;
  startDate: string;
  goalId: string | undefined;
}

function todayDateInputValue(): string {
  return new Date().toISOString().split("T")[0];
}

function defaultFormState(paymentModes: PaymentMode[]): RecurringFormState {
  return {
    reason: "",
    amount: "",
    paymentMode: paymentModes[0]?.name ?? "Cash",
    type: "expense",
    cadence: "monthly",
    dayOfMonth: String(new Date().getDate()),
    startDate: todayDateInputValue(),
    goalId: undefined,
  };
}

function formStateFromRule(rule: RecurringRule): RecurringFormState {
  const start = new Date(rule.startDate);
  return {
    reason: rule.template.reason,
    amount: String(rule.template.amount),
    paymentMode: rule.template.paymentMode,
    type: rule.template.type === "income" ? "income" : "expense",
    cadence: rule.cadence,
    dayOfMonth: String(rule.dayOfMonth ?? start.getDate()),
    startDate: start.toISOString().split("T")[0],
    goalId: rule.template.goalId,
  };
}

function buildRulePayload(
  state: RecurringFormState,
  existing?: RecurringRule
): Omit<RecurringRule, "id" | "active" | "lastFiredDate"> {
  const parsedDay = parseInt(state.dayOfMonth, 10);
  const scheduleChanged =
    !existing ||
    existing.cadence !== state.cadence ||
    (state.cadence === "monthly" && existing.dayOfMonth !== parsedDay) ||
    (state.cadence !== "monthly" &&
      existing.startDate.split("T")[0] !== state.startDate);

  const resolvedStartDate = scheduleChanged
    ? state.cadence === "monthly"
      ? monthlyStartDate(parsedDay).toISOString()
      : new Date(state.startDate).toISOString()
    : existing.startDate;

  return {
    template: {
      reason: state.reason.trim(),
      amount: parseFloat(state.amount),
      paymentMode: state.paymentMode,
      type: state.type,
      necessity: null,
      goalId: state.goalId,
    },
    cadence: state.cadence,
    dayOfMonth: state.cadence === "monthly" ? parsedDay : undefined,
    startDate: resolvedStartDate,
  };
}

function isFormValid(state: RecurringFormState): boolean {
  const parsedDay = parseInt(state.dayOfMonth, 10);
  const monthlyDayValid =
    state.cadence !== "monthly" || (parsedDay >= 1 && parsedDay <= 31);
  return (
    Boolean(state.reason.trim()) &&
    parseFloat(state.amount) > 0 &&
    monthlyDayValid
  );
}

interface RecurringRuleFormProps {
  form: RecurringFormState;
  paymentModes: PaymentMode[];
  goals: Goal[];
  mode: "add" | "edit";
  onChange: (updates: Partial<RecurringFormState>) => void;
  onCadenceChange: (cadence: RecurringCadence) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function RecurringRuleForm({
  form,
  paymentModes,
  goals,
  mode,
  onChange,
  onCadenceChange,
  onSubmit,
  onCancel,
}: RecurringRuleFormProps) {
  const parsedDay = parseInt(form.dayOfMonth, 10);
  const canSave = isFormValid(form);
  const schedulePreviewStartDate =
    form.cadence === "monthly"
      ? monthlyStartDate(parsedDay || 1).toISOString()
      : new Date(form.startDate).toISOString();

  return (
    <div className="border border-border rounded-xl p-3 space-y-3 bg-muted/30">
      <input
        value={form.reason}
        onChange={(e) => onChange({ reason: e.target.value })}
        placeholder="Reason (e.g. Rent)"
        className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          value={form.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          placeholder="Amount"
          className="bg-input border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          value={form.paymentMode}
          onChange={(e) => onChange({ paymentMode: e.target.value })}
          className="bg-input border border-border rounded-lg px-3 py-2 text-sm"
        >
          {paymentModes.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex rounded-lg bg-muted p-0.5">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onChange({ type: t })}
            className={cn(
              "flex-1 py-1.5 rounded-md text-xs font-medium capitalize",
              form.type === t
                ? t === "expense"
                  ? "bg-expense/20 text-expense"
                  : "bg-income/20 text-income"
                : "text-muted-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {goals.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Goal</span>
          <GoalChip
            goals={goals}
            selectedGoalId={form.goalId}
            onSelect={(goalId) => onChange({ goalId })}
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Repeats
          </span>
          <select
            value={form.cadence}
            onChange={(e) => onCadenceChange(e.target.value as RecurringCadence)}
            className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm capitalize"
          >
            {CADENCES.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c}
              </option>
            ))}
          </select>
        </label>

        {form.cadence === "monthly" ? (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Day of month
            </span>
            <input
              type="number"
              min={1}
              max={31}
              value={form.dayOfMonth}
              onChange={(e) => onChange({ dayOfMonth: e.target.value })}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        ) : (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              {form.cadence === "daily"
                ? "Starting"
                : form.cadence === "weekly"
                  ? "Starting on"
                  : "Every year on"}
            </span>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        )}

        <p className="text-xs text-muted-foreground">
          {scheduleHint(form.cadence, schedulePreviewStartDate)}
          {form.cadence === "monthly" && (
            <>
              {" "}
              Next: {format(monthlyStartDate(parsedDay || 1), "MMM d, yyyy")}.
            </>
          )}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium"
        >
          Cancel
        </button>
        <button
          disabled={!canSave}
          onClick={onSubmit}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-medium",
            canSave
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {mode === "add" ? "Create" : "Save"}
        </button>
      </div>
    </div>
  );
}

export function RecurringSettings({
  rules,
  paymentModes,
  goals,
  onAdd,
  onUpdate,
  onDelete,
  onToggle,
}: RecurringSettingsProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecurringFormState>(() =>
    defaultFormState(paymentModes)
  );

  const activeGoals = goals.filter((g) => !g.archived);
  const showForm = adding || editingId !== null;
  const formMode = editingId ? "edit" : "add";

  const goalNameById = new Map(activeGoals.map((g) => [g.id, g.name]));

  const patchForm = (updates: Partial<RecurringFormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleCadenceChange = (next: RecurringCadence) => {
    setForm((prev) => {
      const updates: Partial<RecurringFormState> = { cadence: next };
      if (next === "monthly" && prev.startDate) {
        updates.dayOfMonth = String(new Date(prev.startDate).getDate());
      }
      if (next !== "monthly") {
        const day = parseInt(prev.dayOfMonth, 10);
        if (day >= 1 && day <= 31) {
          updates.startDate = monthlyStartDate(day)
            .toISOString()
            .split("T")[0];
        }
      }
      return { ...prev, ...updates };
    });
  };

  const closeForm = () => {
    setAdding(false);
    setEditingId(null);
    setForm(defaultFormState(paymentModes));
  };

  const openAddForm = () => {
    haptic("light");
    setEditingId(null);
    setForm(defaultFormState(paymentModes));
    setAdding(true);
  };

  const openEditForm = (rule: RecurringRule) => {
    haptic("light");
    setAdding(false);
    setEditingId(rule.id);
    setForm(formStateFromRule(rule));
  };

  const handleSubmit = () => {
    if (!isFormValid(form)) return;
    const existing = editingId
      ? rules.find((rule) => rule.id === editingId)
      : undefined;
    const payload = buildRulePayload(form, existing);

    if (editingId) {
      onUpdate(editingId, payload);
    } else {
      onAdd(payload);
    }
    closeForm();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex-1">
          Schedule transactions to auto-create on a cadence. Due rules fire when
          you open the app or save a rule.
        </p>
        {!showForm && (
          <button
            onClick={openAddForm}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      {showForm && (
        <RecurringRuleForm
          form={form}
          paymentModes={paymentModes}
          goals={activeGoals}
          mode={formMode}
          onChange={patchForm}
          onCadenceChange={handleCadenceChange}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}

      {rules.length === 0 && !showForm && (
        <div className="text-center py-8 text-muted-foreground">
          <Repeat className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No recurring rules yet</p>
        </div>
      )}

      <div className="space-y-2">
        {rules.map((r) => {
          const next = nextFireDate(r);
          const goalName = r.template.goalId
            ? goalNameById.get(r.template.goalId)
            : undefined;

          return (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border border-border",
                !r.active && "opacity-50",
                editingId === r.id && "ring-2 ring-primary/30"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {r.template.reason}{" "}
                  <span
                    className={cn(
                      "text-xs font-mono ml-1",
                      r.template.type === "income"
                        ? "text-income"
                        : "text-expense"
                    )}
                  >
                    {r.template.type === "income" ? "+" : "−"}
                    {r.template.amount.toLocaleString("en-PK")}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.template.paymentMode} · {describeRecurringSchedule(r)}
                  {goalName ? ` · ${goalName}` : ""} · next{" "}
                  {format(next, "MMM d")}
                </p>
              </div>
              <button
                onClick={() => openEditForm(r)}
                disabled={showForm}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40"
                aria-label="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onToggle(r.id)}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label={r.active ? "Pause" : "Resume"}
              >
                {r.active ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete recurring rule?")) onDelete(r.id);
                }}
                className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-muted"
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
