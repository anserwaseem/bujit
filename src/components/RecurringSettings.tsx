import { useState } from "react";
import { Plus, Trash2, Pause, Play, Repeat } from "lucide-react";
import type {
  PaymentMode,
  RecurringCadence,
  RecurringRule,
} from "@/lib/types";
import { cn, haptic } from "@/lib/utils";
import { nextFireDate } from "@/lib/recurring";
import { format } from "date-fns";

interface RecurringSettingsProps {
  rules: RecurringRule[];
  paymentModes: PaymentMode[];
  onAdd: (
    rule: Omit<RecurringRule, "id" | "active"> & { active?: boolean }
  ) => void;
  onUpdate: (id: string, updates: Partial<RecurringRule>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

const CADENCES: RecurringCadence[] = ["daily", "weekly", "monthly", "yearly"];

export function RecurringSettings({
  rules,
  paymentModes,
  onAdd,
  onDelete,
  onToggle,
}: RecurringSettingsProps) {
  const [adding, setAdding] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState(
    paymentModes[0]?.name ?? "Cash"
  );
  const [type, setType] = useState<"expense" | "income">("expense");
  const [cadence, setCadence] = useState<RecurringCadence>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const canSave = reason.trim() && parseFloat(amount) > 0;

  const handleSubmit = () => {
    if (!canSave) return;
    onAdd({
      template: {
        reason: reason.trim(),
        amount: parseFloat(amount),
        paymentMode,
        type,
        necessity: null,
      },
      cadence,
      dayOfMonth: cadence === "monthly" ? parseInt(dayOfMonth) : undefined,
      startDate: new Date(startDate).toISOString(),
    });
    setReason("");
    setAmount("");
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex-1">
          Schedule transactions to auto-create on a cadence. They fire when you
          open the app.
        </p>
        {!adding && (
          <button
            onClick={() => {
              haptic("light");
              setAdding(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      {adding && (
        <div className="border border-border rounded-xl p-3 space-y-3 bg-muted/30">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (e.g. Rent)"
            className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="bg-input border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
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
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-xs font-medium capitalize",
                  type === t
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
          <div className="grid grid-cols-2 gap-2">
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value as RecurringCadence)}
              className="bg-input border border-border rounded-lg px-3 py-2 text-sm capitalize"
            >
              {CADENCES.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
            {cadence === "monthly" ? (
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                placeholder="Day"
                className="bg-input border border-border rounded-lg px-3 py-2 text-sm font-mono"
              />
            ) : (
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-input border border-border rounded-lg px-3 py-2 text-sm"
              />
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAdding(false)}
              className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium"
            >
              Cancel
            </button>
            <button
              disabled={!canSave}
              onClick={handleSubmit}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium",
                canSave
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {rules.length === 0 && !adding && (
        <div className="text-center py-8 text-muted-foreground">
          <Repeat className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No recurring rules yet</p>
        </div>
      )}

      <div className="space-y-2">
        {rules.map((r) => {
          const next = nextFireDate(r);
          return (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border border-border",
                !r.active && "opacity-50"
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
                  {r.template.paymentMode} · {r.cadence}
                  {r.cadence === "monthly" && r.dayOfMonth
                    ? ` (day ${r.dayOfMonth})`
                    : ""}{" "}
                  · next {format(next, "MMM d")}
                </p>
              </div>
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