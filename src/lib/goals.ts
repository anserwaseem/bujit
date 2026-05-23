import type { Goal, Transaction } from "./types";

export interface GoalProgress {
  goal: Goal;
  current: number; // amount accumulated / paid back / received
  target?: number;
  remaining?: number; // target - current (only when target defined)
  percent: number; // 0..100 (clamped); savings without target -> 0
  transactionCount: number;
}

/**
 * Compute progress for a goal from its linked transactions.
 *
 * Path A semantics:
 *  - savings: income adds, expense subtracts (net balance accumulated)
 *  - owe:     sum of expense amounts (money paid back) toward target debt
 *  - owed:    sum of income amounts (money received back) toward target loan
 */
export function computeGoalProgress(
  goal: Goal,
  transactions: Transaction[]
): GoalProgress {
  const linked = transactions.filter((t) => t.goalId === goal.id);

  let current = 0;
  if (goal.kind === "savings") {
    for (const t of linked) {
      current += t.type === "income" ? t.amount : -t.amount;
    }
  } else if (goal.kind === "owe") {
    current = linked
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
  } else if (goal.kind === "owed") {
    current = linked
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
  }

  const target = goal.target;
  const remaining =
    target !== undefined ? Math.max(0, target - current) : undefined;
  const percent =
    target && target > 0
      ? Math.max(0, Math.min(100, (current / target) * 100))
      : 0;

  return {
    goal,
    current,
    target,
    remaining,
    percent,
    transactionCount: linked.length,
  };
}

export function computeAllGoalsProgress(
  goals: Goal[],
  transactions: Transaction[]
): GoalProgress[] {
  return goals
    .filter((g) => !g.archived)
    .map((g) => computeGoalProgress(g, transactions));
}