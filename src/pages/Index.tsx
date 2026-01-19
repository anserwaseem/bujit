import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  Activity,
  startTransition,
} from "react";
import { useBujit } from "@/hooks/useBujit";
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
import { parseInput } from "@/lib/parser";
import { useToast } from "@/hooks/use-toast";

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

  const { getFilteredTransactions } = useFilters();

  const [activeTab, setActiveTab] = useState<"transactions" | "dashboard">(
    "transactions"
  );
  const [showFilters, setShowFilters] = useState(false);
  const [sharedInput, setSharedInput] = useState<string>("");
  const { toast } = useToast();

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

  // Handle URL query parameters (for shortcuts) and shared content
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get("action");
    const sharedText = urlParams.get("text") || urlParams.get("title") || "";

    // Handle shortcut actions
    if (action === "dashboard") {
      handleTabChange("dashboard");
      // Clean up URL
      window.history.replaceState({}, "", "/");
    } else if (action === "add-expense") {
      handleTabChange("transactions");
      setSharedInput("");
      // Clean up URL
      window.history.replaceState({}, "", "/");
    }

    // Handle shared content
    if (sharedText) {
      // Normalize shared text: remove currency symbols, normalize whitespace
      let normalized = sharedText
        .trim()
        .replace(/[$₹€£]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      // If it's just a number, prepend "Shared" so parseInput can handle it
      if (/^\d+(?:[.,]\d+)?$/.test(normalized)) {
        normalized = `Shared ${normalized}`;
      }

      // Check if it parses (using same parser as TransactionInput)
      const parsed = parseInput(normalized, paymentModes);
      if (parsed && parsed.isValid) {
        setSharedInput(normalized);
        toast({
          title: "Shared content ready",
          description: `Pre-filled: ${parsed.reason} ${parsed.paymentMode} ${parsed.amount}`,
        });
      } else {
        // Still show the normalized text even if parsing fails
        setSharedInput(normalized);
        toast({
          title: "Shared content received",
          description: "You can edit the text before adding",
        });
      }
      // Clean up URL
      window.history.replaceState({}, "", "/");
    }
  }, [paymentModes, handleTabChange, toast]);

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
              onAdd={addTransaction}
              onRepeatLast={handleRepeatLast}
              lastTransaction={lastTransaction}
              initialInput={sharedInput}
              autoFocus={!!sharedInput}
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
            streakData={streakData}
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
