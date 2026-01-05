import { useState, useMemo, useCallback } from "react";
import { useBudgly } from "@/hooks/useBudgly";
import { Header } from "@/components/Header";
import { StatsBar } from "@/components/StatsBar";
import { TransactionInput } from "@/components/TransactionInput";
import { TransactionList } from "@/components/TransactionList";
import { Dashboard } from "@/components/Dashboard";
import { SettingsDialog } from "@/components/SettingsDialog";
import { EditTransactionDialog } from "@/components/EditTransactionDialog";
import { PaymentMode } from "@/lib/types";
import { BarChart3, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const Index = () => {
  const {
    transactions,
    paymentModes,
    theme,
    settings,
    stats,
    timePeriod,
    groupedTransactions,
    quickAddSuggestions,
    toggleTheme,
    setTimePeriod,
    addTransaction,
    deleteTransaction,
    updateNecessity,
    updateTransaction,
    updatePaymentModes,
    updateSettings,
  } = useBudgly();

  const [activeTab, setActiveTab] = useState<"transactions" | "dashboard">(
    "transactions"
  );
  const [showSettings, setShowSettings] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<
    (typeof transactions)[0] | null
  >(null);

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

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6">
          <button
            onClick={() => setActiveTab("transactions")}
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
            onClick={() => setActiveTab("dashboard")}
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

        {activeTab === "transactions" ? (
          <>
            <section>
              <StatsBar
                stats={stats}
                currencySymbol={settings.currencySymbol}
                timePeriod={timePeriod}
                onTimePeriodChange={setTimePeriod}
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
                groupedTransactions={groupedTransactions}
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
          </>
        ) : (
          <Dashboard
            transactions={transactions}
            currencySymbol={settings.currencySymbol}
            timePeriod={timePeriod}
            onTimePeriodChange={setTimePeriod}
          />
        )}
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

export default Index;
