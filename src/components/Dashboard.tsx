import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  type ReactElement,
} from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragCancelEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Transaction, StreakData, DashboardCard } from "@/lib/types";
import { formatAmount } from "@/lib/parser";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  Calendar,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Award,
  Repeat,
  DollarSign,
  CalendarCheck,
  Leaf,
} from "lucide-react";
import { cn, getPeriodText, haptic } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

import { AppSettings } from "@/lib/types";
import { formatMaskedAmount, maskReason } from "@/lib/privacy";
import type { TimePeriod } from "@/hooks/useFilters";
import { getDashboardLayout, saveDashboardLayout } from "@/lib/storage";
import { SortableDashboardCard } from "./SortableDashboardCard";

interface DashboardProps {
  transactions: Transaction[];
  currencySymbol: string;
  settings: AppSettings;
  streakData?: StreakData;
  timePeriod: TimePeriod;
}

export function Dashboard({
  transactions,
  currencySymbol,
  settings,
  streakData,
  timePeriod,
}: DashboardProps) {
  // Transactions are already filtered by the parent component
  const filteredTransactions = transactions;

  const periodText = getPeriodText(timePeriod);

  // Load saved layout or use default
  const [cardLayout, setCardLayout] = useState<DashboardCard[]>(() =>
    getDashboardLayout()
  );
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Keep layout in sync with resets/changes triggered elsewhere (e.g. Settings)
  useEffect(() => {
    const handler = () => setCardLayout(getDashboardLayout());
    window.addEventListener(
      "bujit:dashboard-layout-changed",
      handler as EventListener
    );
    return () => {
      window.removeEventListener(
        "bujit:dashboard-layout-changed",
        handler as EventListener
      );
    };
  }, []);

  // Configure sensors for drag - iOS-friendly configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (prevents accidental drags on iOS)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setCardLayout((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return items;

      const newItems = arrayMove(items, oldIndex, newIndex);

      // Update order numbers
      const updated = newItems.map((item, index) => ({
        ...item,
        order: index,
      }));

      // Save to localStorage
      saveDashboardLayout(updated);

      return updated;
    });
    // Success feedback on drop (only when a reorder actually happened)
    haptic("light");
    setActiveCardId(null);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveCardId(String(event.active.id));
    // iOS-first polish: subtle haptic when drag begins
    haptic("medium");
  }, []);

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setActiveCardId(null);
  }, []);

  const analytics = useMemo(() => {
    const now = new Date();
    const startOfLastMonth = startOfMonth(subMonths(now, 1));
    const endOfLastMonth = endOfMonth(subMonths(now, 1));

    // Use filtered transactions for main stats
    const periodExpenses = filteredTransactions.filter(
      (t) => t.type === "expense"
    );
    const periodIncome = filteredTransactions.filter(
      (t) => t.type === "income"
    );

    // For comparison, use previous period
    const lastMonth = transactions.filter(
      (t) =>
        new Date(t.date) >= startOfLastMonth &&
        new Date(t.date) <= endOfLastMonth &&
        t.type === "expense"
    );

    const periodTotal = periodExpenses.reduce((sum, t) => sum + t.amount, 0);
    const lastMonthTotal = lastMonth.reduce((sum, t) => sum + t.amount, 0);
    const periodIncomeTotal = periodIncome.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    const needsTotal = periodExpenses
      .filter((t) => t.necessity === "need")
      .reduce((sum, t) => sum + t.amount, 0);
    const wantsTotal = periodExpenses
      .filter((t) => t.necessity === "want")
      .reduce((sum, t) => sum + t.amount, 0);
    const uncategorized = periodExpenses
      .filter((t) => !t.necessity)
      .reduce((sum, t) => sum + t.amount, 0);

    // Savings for period
    const savingsThisPeriod = periodIncomeTotal - periodTotal;
    const savingsRate =
      periodIncomeTotal > 0 ? (savingsThisPeriod / periodIncomeTotal) * 100 : 0;

    // By payment mode
    const byMode: Record<string, number> = {};
    periodExpenses.forEach((t) => {
      byMode[t.paymentMode] = (byMode[t.paymentMode] || 0) + t.amount;
    });

    // Top spending categories (by reason)
    const byReason: Record<string, number> = {};
    periodExpenses.forEach((t) => {
      const reason = t.reason || "Other";
      byReason[reason] = (byReason[reason] || 0) + t.amount;
    });
    const topCategories = Object.entries(byReason)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    // Daily spending for the last 7 days
    const dailyData: { day: string; expense: number; income: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      const dayExpense = filteredTransactions
        .filter(
          (t) =>
            new Date(t.date).toDateString() === dateStr && t.type === "expense"
        )
        .reduce((sum, t) => sum + t.amount, 0);
      const dayIncome = filteredTransactions
        .filter(
          (t) =>
            new Date(t.date).toDateString() === dateStr && t.type === "income"
        )
        .reduce((sum, t) => sum + t.amount, 0);
      dailyData.push({
        day: date.toLocaleDateString("en", { weekday: "short" }),
        expense: dayExpense,
        income: dayIncome,
      });
    }

    // Monthly trend (last 6 months) with income
    const monthlyTrend: {
      month: string;
      expense: number;
      income: number;
      savings: number;
    }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthExpense = transactions
        .filter((t) => {
          const d = new Date(t.date);
          return d >= monthStart && d <= monthEnd && t.type === "expense";
        })
        .reduce((sum, t) => sum + t.amount, 0);
      const monthIncome = transactions
        .filter((t) => {
          const d = new Date(t.date);
          return d >= monthStart && d <= monthEnd && t.type === "income";
        })
        .reduce((sum, t) => sum + t.amount, 0);
      monthlyTrend.push({
        month: monthStart.toLocaleDateString("en", { month: "short" }),
        expense: monthExpense,
        income: monthIncome,
        savings: monthIncome - monthExpense,
      });
    }

    // Weekly spending comparison
    const getWeekData = (weeksAgo: number) => {
      const weekStart = new Date();
      weekStart.setDate(
        weekStart.getDate() - weekStart.getDay() - weeksAgo * 7
      );
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return filteredTransactions
        .filter((t) => {
          const d = new Date(t.date);
          return d >= weekStart && d <= weekEnd && t.type === "expense";
        })
        .reduce((sum, t) => sum + t.amount, 0);
    };

    const thisWeekTotal = getWeekData(0);
    const lastWeekTotal = getWeekData(1);
    const weekChange =
      lastWeekTotal > 0
        ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
        : 0;

    // Average daily spending - calculate from filtered transactions date range
    const transactionDates = filteredTransactions.map((t) => new Date(t.date));
    const minDate =
      transactionDates.length > 0
        ? new Date(Math.min(...transactionDates.map((d) => d.getTime())))
        : now;
    const maxDate =
      transactionDates.length > 0
        ? new Date(Math.max(...transactionDates.map((d) => d.getTime())))
        : now;
    const daysInPeriod = Math.max(
      1,
      Math.ceil(
        (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
    );
    const avgDailySpending =
      periodExpenses.length > 0 ? periodTotal / daysInPeriod : 0;

    // Transaction count
    const transactionCount = periodExpenses.length;

    const percentChange =
      lastMonthTotal > 0
        ? ((periodTotal - lastMonthTotal) / lastMonthTotal) * 100
        : 0;

    // Biggest expense in period
    const biggestExpense =
      periodExpenses.length > 0
        ? periodExpenses.reduce(
            (max, t) => (t.amount > max.amount ? t : max),
            periodExpenses[0]
          )
        : null;

    // Most frequent category
    const frequencyByReason: Record<string, number> = {};
    periodExpenses.forEach((t) => {
      const reason = t.reason || "Other";
      frequencyByReason[reason] = (frequencyByReason[reason] || 0) + 1;
    });
    const mostFrequentCategory = Object.entries(frequencyByReason).sort(
      ([, a], [, b]) => b - a
    )[0];

    // Average transaction size
    const avgTransactionSize =
      transactionCount > 0 ? periodTotal / transactionCount : 0;

    // Days with spending
    const uniqueSpendingDays = new Set(
      periodExpenses.map((t) => new Date(t.date).toDateString())
    ).size;

    // Spending streak (consecutive days with expenses)
    const today = new Date();
    let streakDays = 0;
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toDateString();
      const hasExpense = filteredTransactions.some(
        (t) =>
          new Date(t.date).toDateString() === dateStr && t.type === "expense"
      );
      if (hasExpense) {
        streakDays++;
      } else if (i > 0) {
        break;
      }
    }

    // Best/worst spending day in period
    const dailyTotals: Record<string, number> = {};
    periodExpenses.forEach((t) => {
      const dateStr = new Date(t.date).toDateString();
      dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + t.amount;
    });
    const dailyTotalsArr = Object.entries(dailyTotals);
    const bestDay =
      dailyTotalsArr.length > 0
        ? dailyTotalsArr.reduce((min, curr) => (curr[1] < min[1] ? curr : min))
        : null;
    const worstDay =
      dailyTotalsArr.length > 0
        ? dailyTotalsArr.reduce((max, curr) => (curr[1] > max[1] ? curr : max))
        : null;

    // Needs/wants ratio
    const needsWantsRatio =
      wantsTotal > 0 ? needsTotal / wantsTotal : needsTotal > 0 ? Infinity : 0;

    return {
      periodTotal,
      lastMonthTotal,
      periodIncomeTotal,
      percentChange,
      needsTotal,
      wantsTotal,
      uncategorized,
      savingsThisPeriod,
      savingsRate,
      thisWeekTotal,
      lastWeekTotal,
      weekChange,
      avgDailySpending,
      transactionCount,
      topCategories,
      byMode: Object.entries(byMode).map(([name, value]) => ({ name, value })),
      dailyData,
      monthlyTrend,
      biggestExpense,
      mostFrequentCategory,
      avgTransactionSize,
      uniqueSpendingDays,
      streakDays,
      bestDay,
      worstDay,
      needsWantsRatio,
    };
  }, [filteredTransactions, transactions]);

  const pieData = [
    { name: "Needs", value: analytics.needsTotal, color: "hsl(190, 65%, 50%)" },
    { name: "Wants", value: analytics.wantsTotal, color: "hsl(35, 85%, 55%)" },
    {
      name: "Other",
      value: analytics.uncategorized,
      color: "hsl(220, 15%, 40%)",
    },
  ].filter((d) => d.value > 0);

  // Helper to format amounts with privacy mode
  const formatAmountWithPrivacy = useCallback(
    (amount: number): string => {
      if (settings.privacyMode?.hideAmounts) {
        return formatMaskedAmount(amount, settings, currencySymbol);
      }
      return `${currencySymbol}${formatAmount(amount)}`;
    },
    [settings, currencySymbol]
  );

  // Create card renderers map
  const cardRenderers = useMemo(() => {
    const modeColors = [
      "hsl(158, 55%, 50%)",
      "hsl(190, 65%, 50%)",
      "hsl(35, 85%, 55%)",
      "hsl(265, 50%, 60%)",
      "hsl(0, 60%, 55%)",
    ];

    const categoryColors = [
      "hsl(var(--primary))",
      "hsl(190, 65%, 50%)",
      "hsl(35, 85%, 55%)",
      "hsl(265, 50%, 60%)",
      "hsl(158, 55%, 50%)",
    ];
    const renderers: Record<string, ReactElement | null> = {
      spent: (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">
              Spent
            </span>
          </div>
          <p className="text-base sm:text-xl font-bold font-mono text-expense truncate">
            {formatAmountWithPrivacy(analytics.periodTotal)}
          </p>
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] sm:text-xs mt-1",
              analytics.percentChange <= 0 ? "text-income" : "text-expense"
            )}
          >
            {analytics.percentChange <= 0 ? (
              <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
            ) : (
              <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
            )}
            <span className="truncate">
              {Math.abs(analytics.percentChange).toFixed(0)}% vs last month
            </span>
          </div>
        </div>
      ),
      income: (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">
              Income
            </span>
          </div>
          <p className="text-base sm:text-xl font-bold font-mono text-income truncate">
            {formatAmountWithPrivacy(analytics.periodIncomeTotal)}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
            Filtered results
          </p>
        </div>
      ),
      savings: (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">
              Savings
            </span>
          </div>
          <p
            className={cn(
              "text-base sm:text-xl font-bold font-mono truncate",
              analytics.savingsThisPeriod >= 0 ? "text-income" : "text-expense"
            )}
          >
            {analytics.savingsThisPeriod >= 0 ? "+" : ""}
            {formatAmountWithPrivacy(Math.abs(analytics.savingsThisPeriod))}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            {analytics.savingsRate >= 0 ? analytics.savingsRate.toFixed(0) : 0}%
            savings rate
          </p>
        </div>
      ),
      "this-week": (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">
              This Week
            </span>
          </div>
          <p className="text-base sm:text-xl font-bold font-mono text-foreground truncate">
            {formatAmountWithPrivacy(analytics.thisWeekTotal)}
          </p>
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] sm:text-xs mt-1",
              analytics.weekChange <= 0 ? "text-income" : "text-expense"
            )}
          >
            {analytics.weekChange <= 0 ? (
              <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
            ) : (
              <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
            )}
            <span className="truncate">
              {Math.abs(analytics.weekChange).toFixed(0)}% vs last week
            </span>
          </div>
        </div>
      ),
      "daily-avg": (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">
              Daily Avg
            </span>
          </div>
          <p className="text-base sm:text-xl font-bold font-mono text-foreground truncate">
            {formatAmountWithPrivacy(analytics.avgDailySpending)}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            Per day {periodText}
          </p>
        </div>
      ),
      "avg-txn": (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">
              Avg/Txn
            </span>
          </div>
          <p className="text-base sm:text-xl font-bold font-mono text-foreground truncate">
            {formatAmountWithPrivacy(analytics.avgTransactionSize)}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            Per transaction
          </p>
        </div>
      ),
      "no-expense-streak": (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-income" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">
              No-Expense Streak
            </span>
          </div>
          <p className="text-base sm:text-xl font-bold font-mono text-income">
            {streakData?.noExpenseStreak || 0}{" "}
            {(streakData?.noExpenseStreak || 0) === 1 ? "day" : "days"}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            Days without spending
          </p>
        </div>
      ),
      "spending-streak": (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">
              Spending Streak
            </span>
          </div>
          <p className="text-base sm:text-xl font-bold font-mono text-foreground">
            {streakData?.spendingStreak || analytics.streakDays}{" "}
            {(streakData?.spendingStreak || analytics.streakDays) === 1
              ? "day"
              : "days"}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            Consecutive spending
          </p>
        </div>
      ),
      "active-days": (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">
              Active Days
            </span>
          </div>
          <p className="text-base sm:text-xl font-bold font-mono text-foreground">
            {analytics.uniqueSpendingDays}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            Days with expenses
          </p>
        </div>
      ),
      "most-frequent": analytics.mostFrequentCategory ? (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">
              Most Frequent
            </span>
          </div>
          <p className="text-sm sm:text-lg font-bold text-foreground capitalize truncate">
            {maskReason(analytics.mostFrequentCategory[0], settings)}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            {analytics.mostFrequentCategory[1]} times {periodText}
          </p>
        </div>
      ) : null,
      "biggest-expense": analytics.biggestExpense ? (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">
              Biggest Expense
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium capitalize truncate text-sm sm:text-base flex-1">
              {maskReason(
                analytics.biggestExpense.reason || "Unknown",
                settings
              )}
            </p>
            <p className="text-sm sm:text-lg font-bold font-mono text-expense flex-shrink-0">
              {formatAmountWithPrivacy(analytics.biggestExpense.amount)}
            </p>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            {format(new Date(analytics.biggestExpense.date), "MMM d")} via{" "}
            {analytics.biggestExpense.paymentMode}
          </p>
        </div>
      ) : null,
      "best-day": analytics.bestDay ? (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Best Day
          </p>
          <p className="font-mono font-bold text-income text-sm sm:text-base truncate">
            {formatAmountWithPrivacy(analytics.bestDay[1])}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {format(new Date(analytics.bestDay[0]), "MMM d")}
          </p>
        </div>
      ) : null,
      "worst-day": analytics.worstDay ? (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Worst Day
          </p>
          <p className="font-mono font-bold text-expense text-sm sm:text-base truncate">
            {formatAmountWithPrivacy(analytics.worstDay[1])}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {format(new Date(analytics.worstDay[0]), "MMM d")}
          </p>
        </div>
      ) : null,
      "daily-chart": (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
            Last 7 Days
          </h3>
          <div className="h-32 sm:h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.dailyData}>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                  formatter={(value: number, name: string) => [
                    settings.privacyMode?.hideAmounts
                      ? formatMaskedAmount(value, settings, currencySymbol)
                      : `${currencySymbol}${formatAmount(value)}`,
                    name === "expense" ? "Spent" : "Earned",
                  ]}
                />
                <Bar
                  dataKey="expense"
                  fill="hsl(var(--expense))"
                  radius={[4, 4, 0, 0]}
                  name="expense"
                />
                <Bar
                  dataKey="income"
                  fill="hsl(var(--income))"
                  radius={[4, 4, 0, 0]}
                  name="income"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-3 sm:gap-4 mt-2">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-expense" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                Expense
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-income" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                Income
              </span>
            </div>
          </div>
        </div>
      ),
      "top-categories":
        analytics.topCategories.length > 0 ? (
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
              Top Spending
            </h3>
            <div className="space-y-2.5 sm:space-y-3">
              {analytics.topCategories.map((cat, index) => {
                const maxValue = analytics.topCategories[0]?.value || 1;
                const percentage = (cat.value / maxValue) * 100;
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-xs sm:text-sm font-medium capitalize truncate flex-1">
                        {maskReason(cat.name, settings)}
                      </span>
                      <span className="font-mono text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                        {formatAmountWithPrivacy(cat.value)}
                      </span>
                    </div>
                    <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor:
                            categoryColors[index % categoryColors.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null,
      "needs-wants":
        pieData.length > 0 ? (
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
              Needs vs Wants
            </h3>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-20 h-20 sm:w-28 sm:h-28 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={36}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                {pieData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <span
                        className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs sm:text-sm truncate">
                        {maskReason(item.name, settings)}
                      </span>
                    </div>
                    <span className="font-mono text-xs sm:text-sm flex-shrink-0">
                      {formatAmountWithPrivacy(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null,
      "payment-mode":
        analytics.byMode.length > 0 ? (
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
              By Payment Mode
            </h3>
            <div className="h-28 sm:h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byMode} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                    }}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    formatter={(value: number) => [
                      settings.privacyMode?.hideAmounts
                        ? formatMaskedAmount(value, settings, currencySymbol)
                        : `${currencySymbol}${formatAmount(value)}`,
                      "Spent",
                    ]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {analytics.byMode.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={modeColors[index % modeColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null,
      "monthly-trend": (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
            6 Month Overview
          </h3>
          <div className="h-36 sm:h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.monthlyTrend}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      income: "Income",
                      expense: "Expense",
                      savings: "Savings",
                    };
                    return [
                      settings.privacyMode?.hideAmounts
                        ? formatMaskedAmount(value, settings, currencySymbol)
                        : `${currencySymbol}${formatAmount(value)}`,
                      labels[name] || name,
                    ];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="hsl(var(--income))"
                  fill="hsl(var(--income))"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="hsl(var(--expense))"
                  fill="hsl(var(--expense))"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="savings"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-3 sm:gap-4 mt-2">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-income" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                Income
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-expense" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                Expense
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 sm:w-4 h-0 border-t-2 border-dashed border-primary" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                Savings
              </span>
            </div>
          </div>
        </div>
      ),
      "last-month": (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">
            Last Month
          </h3>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm sm:text-lg font-bold font-mono text-foreground truncate">
                {formatAmountWithPrivacy(analytics.lastMonthTotal)}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Total spent
              </p>
            </div>
            <div
              className={cn(
                "px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium flex-shrink-0",
                analytics.percentChange <= 0
                  ? "bg-income/15 text-income"
                  : "bg-expense/15 text-expense"
              )}
            >
              {analytics.percentChange <= 0 ? "↓" : "↑"}{" "}
              {Math.abs(analytics.percentChange).toFixed(0)}%
            </div>
          </div>
        </div>
      ),
    };
    return renderers;
  }, [
    analytics,
    currencySymbol,
    streakData,
    settings,
    periodText,
    pieData,
    formatAmountWithPrivacy,
  ]);

  // Filter visible cards and sort by order
  const visibleCards = useMemo(() => {
    return cardLayout
      .filter((card) => card.visible)
      .sort((a, b) => a.order - b.order)
      .filter(
        (card) =>
          cardRenderers[card.id] !== null &&
          cardRenderers[card.id] !== undefined
      );
  }, [cardLayout, cardRenderers]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={visibleCards.map((c) => c.id)}
        strategy={rectSortingStrategy}
      >
        <div className="space-y-4 animate-fade-in">
          {/* Flexible grid that adapts to card order */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {visibleCards.map((card) => {
              const cardContent = cardRenderers[card.id];
              if (!cardContent) return null;

              // Chart cards, biggest-expense, and last-month span full width, others stay in 2-column grid
              const isChart = card.type === "chart";
              const isFullWidth =
                isChart ||
                card.id === "biggest-expense" ||
                card.id === "last-month";

              return (
                <SortableDashboardCard
                  key={card.id}
                  id={card.id}
                  className={isFullWidth ? "col-span-2" : ""}
                >
                  {cardContent}
                </SortableDashboardCard>
              );
            })}
          </div>
        </div>
      </SortableContext>

      {/* Drag overlay: lifted card with stronger shadow + slight scale */}
      <DragOverlay>
        {activeCardId ? (
          <div
            className={cn(
              "relative pointer-events-none rounded-xl",
              "shadow-2xl shadow-black/40 ring-1 ring-border/60",
              "scale-[1.02]"
            )}
          >
            {cardRenderers[activeCardId]}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
