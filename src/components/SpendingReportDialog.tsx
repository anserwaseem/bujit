import { useState, useMemo, useCallback } from "react";
import { X, Search, Calendar, TrendingDown, CreditCard, DollarSign } from "lucide-react";
import { Transaction } from "@/lib/types";
import { formatAmount } from "@/lib/parser";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  subYears,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfDay,
  endOfDay,
} from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { TransactionCard } from "./TransactionCard";

type ReportTimePeriod =
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"
  | "thisWeek"
  | "lastWeek"
  | "allTime"
  | "custom";

const TIME_PERIOD_LABELS: Record<ReportTimePeriod, string> = {
  thisMonth: "This Month",
  lastMonth: "Last Month",
  thisYear: "This Year",
  lastYear: "Last Year",
  thisWeek: "This Week",
  lastWeek: "Last Week",
  allTime: "All Time",
  custom: "Custom Range",
};

function getDateRangeForPeriod(period: ReportTimePeriod): {
  start: Date | null;
  end: Date | null;
} {
  const now = new Date();
  switch (period) {
    case "thisMonth":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "lastMonth": {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case "thisYear":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "lastYear": {
      const lastYear = subYears(now, 1);
      return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
    }
    case "thisWeek":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "lastWeek": {
      const lastWeek = subWeeks(now, 1);
      return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
    }
    case "allTime":
      return { start: null, end: null };
    case "custom":
      return { start: null, end: null };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

interface SpendingReportDialogProps {
  transactions: Transaction[];
  currencySymbol: string;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
  onUpdateNecessity?: (id: string, necessity: "need" | "want" | null) => void;
}

export function SpendingReportDialog({
  transactions,
  currencySymbol,
  isOpen,
  onClose,
  onDelete,
  onEdit,
  onUpdateNecessity,
}: SpendingReportDialogProps) {
  const [timePeriod, setTimePeriod] = useState<ReportTimePeriod>("thisMonth");
  const [searchString, setSearchString] = useState("");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Get date range based on period or custom dates
  const dateRange = useMemo(() => {
    if (timePeriod === "custom") {
      return {
        start: customStartDate ? startOfDay(customStartDate) : null,
        end: customEndDate ? endOfDay(customEndDate) : null,
      };
    }
    return getDateRangeForPeriod(timePeriod);
  }, [timePeriod, customStartDate, customEndDate]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Date range filter
      if (dateRange.start || dateRange.end) {
        const txDate = new Date(t.date);
        if (dateRange.start && txDate < dateRange.start) return false;
        if (dateRange.end && txDate > dateRange.end) return false;
      }

      // Search filter (case-insensitive contains)
      if (searchString.trim()) {
        const searchLower = searchString.toLowerCase();
        const reasonLower = t.reason.toLowerCase();
        if (!reasonLower.includes(searchLower)) return false;
      }

      return true;
    });
  }, [transactions, dateRange, searchString]);

  // Only expenses for spending report
  const expenseTransactions = useMemo(() => {
    return filteredTransactions.filter((t) => t.type === "expense");
  }, [filteredTransactions]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const count = expenseTransactions.length;
    const average = count > 0 ? total / count : 0;
    return { total, count, average };
  }, [expenseTransactions]);

  // Chart data - group by day
  const chartData = useMemo(() => {
    const dailyTotals: Record<string, { amount: number; date: Date }> = {};
    expenseTransactions.forEach((t) => {
      const txDate = new Date(t.date);
      const dateKey = format(txDate, "MMM d");
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = { amount: 0, date: txDate };
      }
      dailyTotals[dateKey].amount += t.amount;
    });

    return Object.entries(dailyTotals)
      .map(([day, { amount, date }]) => ({ day, amount, date }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ day, amount }) => ({ day, amount }));
  }, [expenseTransactions]);

  // Group transactions by date for display
  const groupedTransactions = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    expenseTransactions.forEach((t) => {
      const dateKey = format(new Date(t.date), "yyyy-MM-dd");
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(t);
    });

    return Object.entries(grouped)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, txs]) => [date, txs] as [string, Transaction[]]);
  }, [expenseTransactions]);

  const handleClearFilters = useCallback(() => {
    setSearchString("");
    setTimePeriod("thisMonth");
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in sm:p-4">
      <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-card border-0 sm:border border-border rounded-none sm:rounded-2xl shadow-xl animate-scale-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">Spending Report</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Time Period Selector */}
            <Select
              value={timePeriod}
              onValueChange={(v) => setTimePeriod(v as ReportTimePeriod)}
            >
              <SelectTrigger className="w-full sm:w-auto sm:min-w-[140px] h-9 text-xs rounded-xl bg-background border-border/50">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIME_PERIOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search transaction reason..."
                value={searchString}
                onChange={(e) => setSearchString(e.target.value)}
                className="pl-9 pr-9 h-9 text-sm bg-background rounded-xl"
              />
              {searchString && (
                <button
                  onClick={() => setSearchString("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Custom Date Range Pickers */}
          {timePeriod === "custom" && (
            <div className="flex items-center gap-2">
              <Popover open={showStartPicker} onOpenChange={setShowStartPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 h-9 justify-start text-left text-xs font-normal rounded-xl",
                      !customStartDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-3.5 w-3.5" />
                    {customStartDate
                      ? format(customStartDate, "MMM d, yyyy")
                      : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customStartDate}
                    onSelect={(date) => {
                      setCustomStartDate(date);
                      setShowStartPicker(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <span className="text-xs text-muted-foreground">to</span>

              <Popover open={showEndPicker} onOpenChange={setShowEndPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 h-9 justify-start text-left text-xs font-normal rounded-xl",
                      !customEndDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-3.5 w-3.5" />
                    {customEndDate
                      ? format(customEndDate, "MMM d, yyyy")
                      : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customEndDate}
                    onSelect={(date) => {
                      setCustomEndDate(date);
                      setShowEndPicker(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Clear Filters */}
          {(searchString || timePeriod !== "thisMonth" || customStartDate || customEndDate) && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-muted/50 border border-border rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs uppercase tracking-wider">
                  Total
                </span>
              </div>
              <p className="text-base sm:text-xl font-bold font-mono text-expense truncate">
                {currencySymbol}
                {formatAmount(summaryStats.total)}
              </p>
            </div>

            <div className="bg-muted/50 border border-border rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs uppercase tracking-wider">
                  Count
                </span>
              </div>
              <p className="text-base sm:text-xl font-bold font-mono text-foreground">
                {summaryStats.count}
              </p>
            </div>

            <div className="bg-muted/50 border border-border rounded-xl p-3 sm:p-4 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs uppercase tracking-wider">
                  Average
                </span>
              </div>
              <p className="text-base sm:text-xl font-bold font-mono text-foreground truncate">
                {currencySymbol}
                {formatAmount(summaryStats.average)}
              </p>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-muted/30 border border-border rounded-xl p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
                Spending Over Time
              </h3>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                      formatter={(value: number) => [
                        `${currencySymbol}${formatAmount(value)}`,
                        "Spent",
                      ]}
                    />
                    <Bar
                      dataKey="amount"
                      fill="hsl(var(--expense))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Transaction List */}
          {groupedTransactions.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
                Transactions ({expenseTransactions.length})
              </h3>
              <div className="space-y-1">
                {groupedTransactions.map(([date, txs]) => (
                  <div key={date} className="space-y-1">
                    <div className="text-xs text-muted-foreground px-2 py-1">
                      {format(new Date(date), "EEEE, MMM d, yyyy")}
                    </div>
                    {txs.map((transaction) => (
                      <TransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        currencySymbol={currencySymbol}
                        onDelete={onDelete || (() => {})}
                        onEdit={onEdit || (() => {})}
                        onUpdateNecessity={onUpdateNecessity || (() => {})}
                        showDate={false}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No transactions found
              </h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Try adjusting your filters to see more results
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
