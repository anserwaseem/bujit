import {
  useState,
  useMemo,
  useCallback,
  Activity,
  startTransition,
} from "react";
import { useBudgly } from "@/hooks/useBudgly";
import { FilterProvider, useFilters } from "@/hooks/useFilters.tsx";
import { Header } from "@/components/Header";
import { StatsBar } from "@/components/StatsBar";
import { TransactionInput } from "@/components/TransactionInput";
import { TransactionList } from "@/components/TransactionList";
import { Dashboard } from "@/components/Dashboard";
import { FilterButton, FilterContent } from "@/components/FilterPanel";
import { SettingsDialog } from "@/components/SettingsDialog";
import { EditTransactionDialog } from "@/components/EditTransactionDialog";
import { PaymentMode, Transaction } from "@/lib/types";
import { BarChart3, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const IndexContent = () => {
  const {
    transactions,
    paymentModes,
    theme,
    settings,
    stats,
    groupedTransactions,
    quickAddSuggestions,
    toggleTheme,
    addTransaction,
    deleteTransaction,
    updateNecessity,
    updateTransaction,
    updatePaymentModes,
    updateSettings,
  } = useBudgly();

  const { getFilteredTransactions } = useFilters();

  const [activeTab, setActiveTab] = useState<"transactions" | "dashboard">(
    "transactions"
  );
  const [showFilters, setShowFilters] = useState(false);

  // handle tab change with native View Transition API for smooth animations
  const handleTabChange = useCallback((tab: "transactions" | "dashboard") => {
    const toggleTab = () => startTransition(() => setActiveTab(tab));
    // use browser's native View Transition API if available
    if (document.startViewTransition) {
      document.startViewTransition(() => toggleTab());
    } else {
      // fallback to startTransition if View Transition API not supported
      toggleTab();
    }
  }, []);
  const [showSettings, setShowSettings] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<
    (typeof transactions)[0] | null
  >(null);

  // Get filtered transactions based on active filters
  const filteredTransactions = useMemo(() => {
    return getFilteredTransactions(transactions);
  }, [transactions, getFilteredTransactions]);

  // Calculate stats from filtered transactions
  const filteredStats = useMemo(() => {
    const totalExpenses = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const needsTotal = filteredTransactions
      .filter((t) => t.type === "expense" && t.necessity === "need")
      .reduce((sum, t) => sum + t.amount, 0);
    const wantsTotal = filteredTransactions
      .filter((t) => t.type === "expense" && t.necessity === "want")
      .reduce((sum, t) => sum + t.amount, 0);
    const uncategorized = filteredTransactions
      .filter((t) => t.type === "expense" && t.necessity === null)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalExpenses,
      totalIncome,
      needsTotal,
      wantsTotal,
      uncategorized,
      transactionCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Group filtered transactions by date for TransactionList
  const groupedFilteredTransactions = useMemo(() => {
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

  // Today's transaction count
  const todayCount = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return transactions.filter(
      (t) => format(new Date(t.date), "yyyy-MM-dd") === today
    ).length;
  }, [transactions]);

  // Last transaction for repeat feature
  const lastTransaction = useMemo(() => {
    return transactions.length > 0 ? transactions[0] : null;
  }, [transactions]);

  // Repeat last transaction
  const handleRepeatLast = useCallback(() => {
    if (lastTransaction) {
      addTransaction({
        date: new Date().toISOString(),
        reason: lastTransaction.reason,
        amount: lastTransaction.amount,
        paymentMode: lastTransaction.paymentMode,
        type: lastTransaction.type,
        necessity: lastTransaction.necessity,
      });
    }
  }, [lastTransaction, addTransaction]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 pb-24">
        <Header
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* Tab Navigation with Filters */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => handleTabChange("transactions")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
                  activeTab === "transactions"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="w-4 h-4" />
                Transactions
              </button>
              <button
                onClick={() => handleTabChange("dashboard")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
                  activeTab === "dashboard"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </button>
            </div>

            {/* Filters Icon Button */}
            <FilterButton onClick={() => setShowFilters(!showFilters)} />
          </div>

          {/* Filters Panel - Inline below tabs */}
          <FilterContent isOpen={showFilters} />
        </div>

        {/* Transactions view with Activity for state preservation */}
        <Activity mode={activeTab === "transactions" ? "visible" : "hidden"}>
          <section>
            <StatsBar
              stats={filteredStats}
              currencySymbol={settings.currencySymbol}
            />
          </section>

          <section className="py-6">
            <TransactionInput
              paymentModes={paymentModes}
              currencySymbol={settings.currencySymbol}
              quickAddSuggestions={quickAddSuggestions}
              transactions={transactions}
              todayCount={todayCount}
              onAdd={addTransaction}
              onRepeatLast={handleRepeatLast}
              lastTransaction={lastTransaction}
            />
          </section>

          <section className="pb-6">
            <TransactionList
              groupedTransactions={groupedFilteredTransactions}
              currencySymbol={settings.currencySymbol}
              onDelete={deleteTransaction}
              onEdit={setEditingTransaction}
              onUpdateNecessity={updateNecessity}
              onDuplicate={(t) => {
                return addTransaction({
                  date: new Date().toISOString(),
                  reason: t.reason,
                  amount: t.amount,
                  paymentMode: t.paymentMode,
                  type: t.type,
                  necessity: t.necessity,
                });
              }}
            />
          </section>
        </Activity>

        {/* Dashboard view with Activity for state preservation */}
        <Activity mode={activeTab === "dashboard" ? "visible" : "hidden"}>
          <Dashboard
            transactions={filteredTransactions}
            currencySymbol={settings.currencySymbol}
          />
        </Activity>
      </div>

      {/* Dialogs */}
      {showSettings && (
        <SettingsDialog
          settings={settings}
          paymentModes={paymentModes}
          transactions={transactions}
          onSaveSettings={updateSettings}
          onSavePaymentModes={updatePaymentModes}
          onImportTransactions={(newTransactions, newModes?: PaymentMode[]) => {
            // Save new payment modes first
            if (newModes && newModes.length > 0) {
              updatePaymentModes([...paymentModes, ...newModes]);
            }
            newTransactions.forEach((t) => addTransaction(t));
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {editingTransaction && (
        <EditTransactionDialog
          transaction={editingTransaction}
          paymentModes={paymentModes}
          currencySymbol={settings.currencySymbol}
          onSave={updateTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
};

const Index = () => {
  return (
    <FilterProvider>
      <IndexContent />
    </FilterProvider>
  );
};

export default Index;
