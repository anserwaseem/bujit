import {
  useState,
  useMemo,
  useCallback,
  Activity,
  startTransition,
} from "react";
import { useBujit } from "@/hooks/useBujit";
import { useGoals } from "@/hooks/useGoals";
import { useRecurring } from "@/hooks/useRecurring";
import { computeAllGoalsProgress } from "@/lib/goals";
import { FilterProvider, useFilters } from "@/hooks/useFilters.tsx";
import { Header } from "@/components/Header";
import { StatsBar } from "@/components/StatsBar";
import { TransactionInput } from "@/components/TransactionInput";
import { TransactionList } from "@/components/TransactionList";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { FilterButton, FilterContent } from "@/components/FilterPanel";
import { SettingsDialog } from "@/components/SettingsDialog";
import { EditTransactionDialog } from "@/components/EditTransactionDialog";
import { GoalsScreen } from "@/components/GoalsScreen";
import { TransferOutScreen } from "@/components/TransferOutScreen";
import { TransferInScreen } from "@/components/TransferInScreen";
import {
  FilteredTransactionsDialog,
  type AdditionalFilterCriteria,
} from "@/components/FilteredTransactionsDialog";
import { PaymentMode, Transaction } from "@/lib/types";
import { BarChart3, List } from "lucide-react";
import { cn } from "@/lib/utils";

const IndexContent = () => {
  const {
    transactions,
    paymentModes,
    theme,
    settings,
    quickAddSuggestions,
    streakData,
    toggleTheme,
    addTransaction,
    deleteTransaction,
    updateNecessity,
    updateTransaction,
    updatePaymentModes,
    updateSettings,
  } = useBujit();

  const { goals, addGoal, updateGoal, deleteGoal, archiveGoal } = useGoals();
  const recurring = useRecurring({
    onFire: (txs) => {
      txs.forEach((t) => addTransaction(t));
    },
  });

  const { getFilteredTransactions, filters } = useFilters();
  const { timePeriod } = filters;

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
  const [filteredDialogOpen, setFilteredDialogOpen] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showTransferOut, setShowTransferOut] = useState(false);
  const [showTransferIn, setShowTransferIn] = useState(false);
  const [additionalFilter, setAdditionalFilter] =
    useState<AdditionalFilterCriteria | null>(null);
  const [dialogTitle, setDialogTitle] = useState<string>("");

  // Get filtered transactions based on active filters
  const filteredTransactions = useMemo(() => {
    return getFilteredTransactions(transactions);
  }, [transactions, getFilteredTransactions]);

  const goalsProgress = useMemo(
    () => computeAllGoalsProgress(goals, transactions),
    [goals, transactions]
  );

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

  // Handle opening filtered transactions dialog from dashboard
  const handleOpenFilteredTransactions = useCallback(
    (additionalFilter: AdditionalFilterCriteria, title: string) => {
      setAdditionalFilter(additionalFilter);
      setDialogTitle(title);
      setFilteredDialogOpen(true);
    },
    []
  );

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
              settings={settings}
            />
          </section>

          <section className="py-6">
            <TransactionInput
              paymentModes={paymentModes}
              currencySymbol={settings.currencySymbol}
              quickAddSuggestions={quickAddSuggestions}
              transactions={transactions}
              onAdd={addTransaction}
              onRepeatLast={handleRepeatLast}
              lastTransaction={lastTransaction}
              goals={goals}
            />
          </section>

          <section className="pb-6">
            <TransactionList
              groupedTransactions={groupedFilteredTransactions}
              currencySymbol={settings.currencySymbol}
              settings={settings}
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
            allTransactions={transactions}
            currencySymbol={settings.currencySymbol}
            settings={settings}
            streakData={streakData}
            timePeriod={timePeriod}
            paymentModes={paymentModes}
            onOpenFilteredTransactions={handleOpenFilteredTransactions}
            goalsProgress={goalsProgress}
            onOpenGoals={() => setShowGoals(true)}
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
          recurring={recurring}
          paymentModesList={paymentModes}
          goals={goals}
          onOpenTransferOut={() => {
            setShowSettings(false);
            setShowTransferOut(true);
          }}
          onOpenTransferIn={() => {
            setShowSettings(false);
            setShowTransferIn(true);
          }}
        />
      )}

      {editingTransaction && (
        <EditTransactionDialog
          transaction={editingTransaction}
          paymentModes={paymentModes}
          currencySymbol={settings.currencySymbol}
          onSave={updateTransaction}
          onClose={() => setEditingTransaction(null)}
          goals={goals}
        />
      )}

      {showGoals && (
        <GoalsScreen
          goals={goals}
          transactions={transactions}
          currencySymbol={settings.currencySymbol}
          settings={settings}
          onAddGoal={addGoal}
          onUpdateGoal={updateGoal}
          onDeleteGoal={deleteGoal}
          onArchiveGoal={archiveGoal}
          onClose={() => setShowGoals(false)}
        />
      )}

      {showTransferOut && (
        <TransferOutScreen onClose={() => setShowTransferOut(false)} />
      )}

      {showTransferIn && (
        <TransferInScreen
          onClose={() => setShowTransferIn(false)}
          onImported={() => {
            // Data is now in localStorage; reload so all hooks pick it up.
            window.location.reload();
          }}
        />
      )}

      {filteredDialogOpen && additionalFilter && (
        <FilteredTransactionsDialog
          transactions={filteredTransactions}
          additionalFilter={additionalFilter}
          dialogTitle={dialogTitle}
          currencySymbol={settings.currencySymbol}
          settings={settings}
          onEdit={setEditingTransaction}
          onDelete={deleteTransaction}
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
          onClose={() => {
            setFilteredDialogOpen(false);
            setAdditionalFilter(null);
            setDialogTitle("");
          }}
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
