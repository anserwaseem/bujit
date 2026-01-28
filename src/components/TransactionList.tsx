import { Transaction, NecessityType, AppSettings } from "@/lib/types";
import { TransactionCard } from "./TransactionCard";
import { getRelativeDate, formatAmount } from "@/lib/parser";
import { formatMaskedAmount } from "@/lib/privacy";
import {
  Receipt,
  Sparkles,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TransactionListProps {
  groupedTransactions: [string, { transactions: Transaction[] }][];
  currencySymbol: string;
  settings: AppSettings;
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onUpdateNecessity: (id: string, necessity: NecessityType) => void;
  onDuplicate?: (transaction: Transaction) => Transaction | void;
  scrollContainerRef?: React.RefObject<HTMLDivElement>; // Optional ref to scroll container (for dialogs)
}

// Animated empty state tips
const emptyStateTips = [
  { icon: Zap, text: "Type 'Coffee CC 150' to add an expense" },
  { icon: Sparkles, text: "Use voice input for hands-free entry" },
  { icon: TrendingUp, text: "Categorize as Need or Want to track habits" },
];

type GroupMode = "day" | "month" | "year";

const ITEMS_PER_PAGE = 20;

export function TransactionList({
  groupedTransactions,
  currencySymbol,
  settings,
  onDelete,
  onEdit,
  onUpdateNecessity,
  onDuplicate,
  scrollContainerRef,
}: TransactionListProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [groupMode, setGroupMode] = useState<GroupMode>("day");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Virtualization
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Rotate tips every 4 seconds
  useEffect(() => {
    if (groupedTransactions.length > 0) return;

    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % emptyStateTips.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [groupedTransactions.length]);

  // Scroll to top visibility - use container if provided, otherwise window
  useEffect(() => {
    const container = scrollContainerRef?.current;
    const handleScroll = () => {
      const scrollTop = container?.scrollTop ?? window.scrollY;
      setShowScrollTop(scrollTop > 200);
    };

    (container ?? window).addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      (container ?? window).removeEventListener("scroll", handleScroll);
    };
  }, [scrollContainerRef]);

  // Infinite scroll with Intersection Observer
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  }, []);

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    if (!loadMoreElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observer.observe(loadMoreElement);

    return () => observer.disconnect();
  }, [loadMore]);

  // Reset visible count when grouped transactions change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [groupedTransactions]);

  const scrollToTop = useCallback(() => {
    (scrollContainerRef?.current ?? window).scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [scrollContainerRef]);

  // Regroup transactions based on mode
  const regroupedTransactions = useMemo(() => {
    if (groupMode === "day") {
      return groupedTransactions;
    }

    // Flatten all transactions
    const allTransactions = groupedTransactions.flatMap(
      ([, { transactions }]) => transactions
    );

    // Group by month or year
    const grouped: Record<
      string,
      { transactions: Transaction[]; dayTotal: number }
    > = {};

    allTransactions.forEach((t) => {
      const date = new Date(t.date);
      const key =
        groupMode === "month" ? format(date, "yyyy-MM") : format(date, "yyyy");

      if (!grouped[key]) {
        grouped[key] = { transactions: [], dayTotal: 0 };
      }
      grouped[key].transactions.push(t);
      if (t.type === "expense") {
        grouped[key].dayTotal += t.amount;
      }
    });

    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  }, [groupedTransactions, groupMode]);

  // Expand most recent by default when switching modes or when groups change
  useEffect(() => {
    if (regroupedTransactions.length > 0) {
      const firstKey = regroupedTransactions[0][0];
      setExpandedGroups((prev) => {
        if (!prev.has(firstKey)) {
          return new Set([firstKey]);
        }
        return prev;
      });
    }
  }, [regroupedTransactions]);

  // Virtualized (paginated) transactions
  const visibleTransactions = useMemo(() => {
    return regroupedTransactions.slice(0, visibleCount);
  }, [regroupedTransactions, visibleCount]);

  // Check if there's more data to load - cap visibleCount to prevent infinite loading
  const hasMore =
    regroupedTransactions.length > 0 &&
    visibleCount < regroupedTransactions.length;

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getGroupLabel = (key: string) => {
    if (groupMode === "day") {
      return getRelativeDate(key);
    }
    if (groupMode === "month") {
      const [year, month] = key.split("-");
      return format(new Date(parseInt(year), parseInt(month) - 1), "MMMM yyyy");
    }
    return key; // year
  };

  if (groupedTransactions.length === 0) {
    const currentTip = emptyStateTips[tipIndex];
    const TipIcon = currentTip.icon;

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 animate-pulse-soft">
          <Receipt className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No transactions yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-[280px] mb-8">
          Start tracking your expenses and income to see insights here
        </p>

        {/* Rotating tip */}
        <div
          className="flex items-center gap-3 px-4 py-3 bg-muted rounded-xl animate-fade-in"
          key={tipIndex}
        >
          <TipIcon className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm text-foreground">{currentTip.text}</p>
        </div>

        {/* Tip indicators */}
        <div className="flex gap-1.5 mt-4">
          {emptyStateTips.map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === tipIndex ? "bg-primary w-4" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" ref={listRef}>
      {/* Group Mode Toggle */}
      <div className="flex items-center justify-center">
        <div className="flex p-1 bg-muted/50 rounded-xl border border-border/50">
          {(["day", "month", "year"] as GroupMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setGroupMode(mode);
                setExpandedGroups(new Set());
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                groupMode === mode
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Groups */}
      <div className="space-y-2">
        {visibleTransactions.map(([key, { transactions }], groupIdx) => {
          const isExpanded = expandedGroups.has(key);
          const groupIncome = transactions
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);
          const groupExpense = transactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);
          const groupNet = groupIncome - groupExpense;

          return (
            <Collapsible
              key={key}
              open={isExpanded}
              onOpenChange={() => toggleGroup(key)}
              className="animate-slide-up"
              style={{ animationDelay: `${Math.min(groupIdx, 5) * 50}ms` }}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors group">
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {getGroupLabel(key)}
                    </span>
                    <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-background/50 rounded-md">
                      {transactions.length}
                    </span>
                  </div>
                  {groupIncome > 0 && groupExpense > 0 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <span
                          className={cn(
                            "text-sm font-mono font-medium cursor-pointer hover:underline",
                            groupNet >= 0 ? "text-income" : "text-expense"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {settings.privacyMode?.hideAmounts
                            ? formatMaskedAmount(
                                Math.abs(groupNet),
                                settings,
                                currencySymbol
                              )
                            : `${groupNet >= 0 ? "+" : ""}${currencySymbol}${formatAmount(Math.abs(groupNet))}`}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-3" align="end">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">
                              Income
                            </span>
                            <span className="text-sm font-mono font-medium text-income">
                              {settings.privacyMode?.hideAmounts
                                ? formatMaskedAmount(
                                    groupIncome,
                                    settings,
                                    currencySymbol
                                  )
                                : `+${currencySymbol}${formatAmount(groupIncome)}`}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">
                              Expenses
                            </span>
                            <span className="text-sm font-mono font-medium text-expense">
                              {settings.privacyMode?.hideAmounts
                                ? formatMaskedAmount(
                                    groupExpense,
                                    settings,
                                    currencySymbol
                                  )
                                : `−${currencySymbol}${formatAmount(groupExpense)}`}
                            </span>
                          </div>
                          <div className="h-px bg-border my-1" />
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-foreground">
                              Net
                            </span>
                            <span
                              className={cn(
                                "text-sm font-mono font-semibold",
                                groupNet >= 0 ? "text-income" : "text-expense"
                              )}
                            >
                              {settings.privacyMode?.hideAmounts
                                ? formatMaskedAmount(
                                    Math.abs(groupNet),
                                    settings,
                                    currencySymbol
                                  )
                                : `${groupNet >= 0 ? "+" : ""}${currencySymbol}${formatAmount(Math.abs(groupNet))}`}
                            </span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span
                      className={cn(
                        "text-sm font-mono font-medium",
                        groupNet >= 0 ? "text-income" : "text-expense"
                      )}
                    >
                      {settings.privacyMode?.hideAmounts
                        ? formatMaskedAmount(
                            Math.abs(groupNet),
                            settings,
                            currencySymbol
                          )
                        : `${groupNet >= 0 ? "+" : ""}${currencySymbol}${formatAmount(Math.abs(groupNet))}`}
                    </span>
                  )}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="space-y-1 pt-2">
                  {transactions.map((transaction, idx) => (
                    <div
                      key={transaction.id}
                      className="animate-fade-in"
                      style={{
                        animationDelay: `${Math.min(idx, 10) * 30}ms`,
                      }}
                    >
                      <TransactionCard
                        transaction={transaction}
                        currencySymbol={currencySymbol}
                        settings={settings}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onUpdateNecessity={onUpdateNecessity}
                        onDuplicate={onDuplicate}
                        showDate={groupMode !== "day"}
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {/* Load More Trigger - only render when there's more to load */}
        {hasMore ? (
          <div ref={loadMoreRef} className="flex justify-center py-4">
            <div className="text-xs text-muted-foreground animate-pulse">
              Loading more...
            </div>
          </div>
        ) : (
          <div className="h-4" /> // Empty spacer when all loaded
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className={cn(
            "w-10 h-10 rounded-full bg-muted/90 backdrop-blur-sm border border-border shadow-lg hover:bg-muted transition-all flex items-center justify-center animate-fade-in touch-manipulation select-none",
            scrollContainerRef
              ? "absolute bottom-4 right-4 z-10"
              : "fixed bottom-4 right-4 z-40"
          )}
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5 text-foreground" />
        </button>
      )}
    </div>
  );
}
