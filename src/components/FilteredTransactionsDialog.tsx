import { useMemo, useRef } from "react";
import { X, SearchX } from "lucide-react";
import type { Transaction, NecessityType, AppSettings } from "@/lib/types";
import { TransactionList } from "./TransactionList";
import { startOfDay, endOfDay } from "date-fns";

export interface AdditionalFilterCriteria {
  type?: "expense" | "income";
  searchQuery?: string;
  necessity?: "need" | "want" | "uncategorized";
  dateRange?: { start: Date; end: Date };
}

interface FilteredTransactionsDialogProps {
  transactions: Transaction[]; // Already filtered by current dashboard filters
  additionalFilter: AdditionalFilterCriteria | null;
  dialogTitle: string;
  currencySymbol: string;
  settings: AppSettings;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onUpdateNecessity: (id: string, necessity: NecessityType) => void;
  onDuplicate: (transaction: Transaction) => void;
  onClose: () => void;
}

function applyAdditionalFilter(
  transactions: Transaction[],
  additionalFilter: AdditionalFilterCriteria
): Transaction[] {
  return transactions.filter((t) => {
    // Filter by type if provided
    if (additionalFilter.type && t.type !== additionalFilter.type) {
      return false;
    }

    // Filter by search query (reason or paymentMode) if provided
    if (additionalFilter.searchQuery) {
      const searchLower = additionalFilter.searchQuery.toLowerCase();
      const reasonLower = t.reason.toLowerCase();
      const paymentModeLower = t.paymentMode.toLowerCase();
      if (
        !reasonLower.includes(searchLower) &&
        !paymentModeLower.includes(searchLower)
      ) {
        return false;
      }
    }

    // Filter by necessity if provided
    if (additionalFilter.necessity) {
      if (t.type !== "expense") return false;
      if (
        additionalFilter.necessity === "uncategorized" &&
        t.necessity !== null
      ) {
        return false;
      }
      if (
        additionalFilter.necessity !== "uncategorized" &&
        t.necessity !== additionalFilter.necessity
      ) {
        return false;
      }
    }

    // Filter by date range if provided
    if (additionalFilter.dateRange) {
      const txDate = new Date(t.date);
      const { start, end } = additionalFilter.dateRange;
      const startOfDayStart = startOfDay(start);
      const endOfDayEnd = endOfDay(end);
      if (txDate < startOfDayStart || txDate > endOfDayEnd) {
        return false;
      }
    }

    return true;
  });
}

export function FilteredTransactionsDialog({
  transactions,
  additionalFilter,
  dialogTitle,
  currencySymbol,
  settings,
  onEdit,
  onDelete,
  onUpdateNecessity,
  onDuplicate,
  onClose,
}: FilteredTransactionsDialogProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Apply additional filter to already-filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!additionalFilter) return transactions;
    return applyAdditionalFilter(transactions, additionalFilter);
  }, [transactions, additionalFilter]);

  // Group filtered transactions by date for TransactionList
  const groupedTransactions = useMemo(() => {
    const groups: Record<
      string,
      { transactions: Transaction[]; dayTotal: number }
    > = {};
    filteredTransactions.forEach((t) => {
      const dateKey = new Date(t.date).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = { transactions: [], dayTotal: 0 };
      }
      groups[dateKey].transactions.push(t);
      if (t.type === "expense") {
        groups[dateKey].dayTotal += t.amount;
      }
    });
    return Object.entries(groups).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [filteredTransactions]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        // Close dialog when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl animate-scale-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold truncate">{dialogTitle}</h2>
          <button
            onClick={onClose}
            className="p-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted/80 active:opacity-70 transition-colors flex-shrink-0 touch-manipulation select-none min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4"
          style={{
            WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
          }}
        >
          {filteredTransactions.length > 0 ? (
            <TransactionList
              groupedTransactions={groupedTransactions}
              currencySymbol={currencySymbol}
              settings={settings}
              onDelete={onDelete}
              onEdit={onEdit}
              onUpdateNecessity={onUpdateNecessity}
              onDuplicate={onDuplicate}
              scrollContainerRef={scrollContainerRef}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <SearchX className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">
                No transactions found
              </h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                No transactions match the selected filter. Try adjusting your
                filters or date range.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
