Bujit Coach Pack — 6 Features

Six features, grouped by complexity. Each is independently shippable; recommended order is bottom-up.

---

## A. Quick wins (Low complexity)

### 1. #3 — Inline math: percent & tip shorthand

Extend `src/lib/mathEval.ts` to preprocess two new patterns before evaluation:

- `N+P%` → `N + (N*P/100)`  e.g. `2400+10%` → 2640
- `N-P%` → `N - (N*P/100)`  e.g. `850-15%` → 722.50
- Division already works (`2400/3`)

No changes to parser or input UI. Live preview already shows the resolved amount via `formatEvaluatedAmount`. Add tests to `src/lib/__tests__/mathEval.test.ts`.

### 2. #5 — Smart anomaly alerts

New `src/lib/anomaly.ts`:

```ts
detectAnomaly(newTx, history) → { isAnomalous, mean, factor } | null
```

Logic:

- Filter last 90 days by `reason (normalized) + paymentMode`
- Require sample size ≥ 5 (else skip — no false alarms for new categories)
- Compute mean μ, stddev σ
- Anomaly if `amount > μ + 2σ` (top ~2.5%)

UI: small inline banner inside `TransactionInput`'s live preview, above the necessity pills:

> ⚠ 3× your usual **Grocery** on **CC** (avg Rs. 3,200). Submit anyway?

Non-blocking, dismissable. Banner shows only when `parsed.isValid`.

### 3. #12 — Calendar heatmap

New dashboard card `spending-heatmap` (fullWidth). GitHub-style year grid:

- 53 weeks × 7 days, colored by daily expense total
- 5 intensity buckets using `hsl(var(--expense))` with alpha
- Tap a cell → opens `FilteredTransactionsDialog` for that day
- Toggle "Year / Last 3 months" inside the card

Add to `src/components/dashboard/registry/buildDashboardCards.tsx` and storage defaults. Pure SVG, no new dep.

---

## B. Medium features

### 4. #2 — Recurring transactions

New file: `src/lib/recurring.ts` + storage key `bujit_recurring`.

Data:

```ts
interface RecurringRule {
  id: string;
  template: Omit<Transaction, "id" | "date">;
  cadence: "daily" | "weekly" | "monthly" | "yearly";
  dayOfMonth?: number;   // for monthly
  startDate: string;
  lastFiredDate?: string;
  active: boolean;
  goalId?: string;       // optional link
}
```

Engine: on app load + on every new transaction, run `processDueRecurring()` which fires any rules where `nextDue ≤ today`, creating real transactions and updating `lastFiredDate`. Idempotent via `lastFiredDate`.

UI:

- Manage recurring rules inside `SettingsDialog` (new "Recurring" section): list + add/edit/pause/delete
- Long-press a transaction card → "Make recurring…" quick action (prefills the template)

Auto-detection (optional, Phase 2): scan history for monthly patterns (same reason+mode+~amount, ~30-day gap, 3+ occurrences) and surface a toast "Looks like Rent CC repeats monthly — set as recurring?"

### 5. #8 + #13 — Unified Goals (loans + sinking funds)

This single feature covers both pain points by treating every long-running money pot the same way.

**Data** — new storage key `bujit_goals`:

```ts
type GoalKind = "savings" | "owe" | "owed";

interface Goal {
  id: string;
  name: string;          // "Zakat 2026", "Ali — borrowed", "iPhone 16"
  kind: GoalKind;
  target?: number;       // required for owe/owed; optional for savings
  counterparty?: string; // for owe/owed
  dueDate?: string;
  createdAt: string;
  archived?: boolean;
}
```

**Linking** — add optional `goalId?: string` to `Transaction`. Backward compatible.

**Progress computation** (per goal, derived — no balance stored):


| Kind    | Progress formula                                              |
| ------- | ------------------------------------------------------------- |
| savings | sum of all linked tx amounts (income adds, expense subtracts) |
| owe     | target − sum(linked expense amounts paid back)                |
| owed    | target − sum(linked income amounts received)                  |


This matches the user's existing journaling style (Path A): salary as income, investments as expenses, borrowing-back as income — all just tagged transactions.

**UI — Dashboard card + dedicated screen** (per user choice):

```text
┌─ Goals ──────────────────── [→] ┐
│  ◐ Zakat 2026     Rs. 18k / 60k │
│  ◐ Ali (owe)      Rs. 30k / 50k │
│  ◐ iPhone 16      Rs. 80k / 200k│
└──────────────────────────────────┘
```

Tap card header → full-screen Goals view with three filter chips (All / Savings / Owe / Owed), per-goal progress ring, linked transactions timeline, edit/archive.

**Tagging a transaction**:

- New "🎯 Tag goal" chip in `TransactionInput`'s live preview (only when ≥1 active goal exists)
- Tapping opens a small dropdown of active goals
- Same chip in `EditTransactionDialog` for retroactive tagging

**Smart inference** — when a tagged goal is selected, auto-suggest a sensible `type`:

- `owe` goal → expense
- `owed` goal → income
- `savings` goal → keeps user's current pick

Zero changes to existing transactions or `TransactionType`. Old data renders as untagged.

---

## Order of work (recommended)

1. Inline math % (Low)
2. Anomaly alerts (Low)
3. Calendar heatmap (Low)
4. Goals data layer + dashboard card + tagging chip (Medium)
5. Goals dedicated screen + per-goal timeline (Medium)
6. Recurring engine + Settings UI (Medium)

Each step ends with tests and is independently shippable.

---

## Technical notes

- **Storage**: all new state in `localStorage` (`bujit_goals`, `bujit_recurring`), mirroring the existing pattern in `src/lib/storage.ts` with validation + corruption recovery.
- **Migration**: none required — all new fields are optional.
- **Hooks**: new `useGoals.ts`, `useRecurring.ts`, `useAnomaly.ts` siblings to `useBujit.ts`.
- **Auto-sync**: tagged transactions sync to Google Sheets via existing pipeline; goals themselves stay local (no sheet columns needed).
- **Dashboard registry**: heatmap + goals cards added to `DEFAULT_DASHBOARD_CARDS` in `storage.ts` and `buildDashboardCards.tsx`; existing layout merge logic picks them up automatically for existing users.
- **Tests**: extend `mathEval.test.ts`; new test files for `anomaly`, `recurring`, `goals` (storage + progress math).
- **Path A philosophy**: documented in a short comment block on the `Goal` type so future contributors understand why we don't introduce a "transfer" transaction type.