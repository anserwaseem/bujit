import {
  useState,
  useMemo,
  useCallback,
  Activity,
  startTransition,
} from "react";
import { useBudgly } from "@/hooks/useBudgly";
import { Header } from "@/components/Header";
import { StatsBar } from "@/components/StatsBar";
import { TransactionInput } from "@/components/TransactionInput";
import { TransactionList } from "@/components/TransactionList";
import { Dashboard } from "@/components/Dashboard";
import { SettingsDialog } from "@/components/SettingsDialog";
import { EditTransactionDialog } from "@/components/EditTransactionDialog";
import { SpendingReportDialog } from "@/components/SpendingReportDialog";
import { PaymentMode } from "@/lib/types";
import { BarChart3, List, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TimePeriod =
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"
  | "allTime";

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  thisMonth: "This Month",
  lastMonth: "Last Month",
  thisYear: "This Year",
  lastYear: "Last Year",
  allTime: "All Time",
};
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
  const [showReport, setShowReport] = useState(false);

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

        {/* Tab Navigation with Time Period */}
        <div className="flex items-center gap-2 mb-6">
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

          {/* Icon-only Time Period Dropdown */}
          <Select
            value={timePeriod}
            onValueChange={(v) => setTimePeriod(v as TimePeriod)}
          >
            <SelectTrigger className="w-auto h-10 px-2.5 bg-muted border-0 rounded-lg hover:bg-muted/80 focus:ring-0 gap-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </SelectTrigger>
            <SelectContent align="end">
              {Object.entries(TIME_PERIOD_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transactions view with Activity for state preservation */}
        <Activity mode={activeTab === "transactions" ? "visible" : "hidden"}>
          <section>
            <StatsBar stats={stats} currencySymbol={settings.currencySymbol} />
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
        </Activity>

        {/* Dashboard view with Activity for state preservation */}
        <Activity mode={activeTab === "dashboard" ? "visible" : "hidden"}>
          <Dashboard
            transactions={transactions}
            currencySymbol={settings.currencySymbol}
            timePeriod={timePeriod}
            onOpenReport={() => setShowReport(true)}
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

      {showReport && (
        <SpendingReportDialog
          transactions={transactions}
          currencySymbol={settings.currencySymbol}
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          onDelete={deleteTransaction}
          onEdit={setEditingTransaction}
          onUpdateNecessity={updateNecessity}
        />
      )}
    </div>
  );
};

export default Index;
