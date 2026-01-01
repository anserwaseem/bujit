import { useState } from 'react';
import { useBudgly } from '@/hooks/useBudgly';
import { Header } from '@/components/Header';
import { StatsBar } from '@/components/StatsBar';
import { TransactionInput } from '@/components/TransactionInput';
import { TransactionList } from '@/components/TransactionList';
import { Dashboard } from '@/components/Dashboard';
import { SettingsDialog } from '@/components/SettingsDialog';
import { EditTransactionDialog } from '@/components/EditTransactionDialog';
import { AIChatDialog } from '@/components/AIChatDialog';
import { Transaction } from '@/lib/types';
import { BarChart3, List, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const Index = () => {
  const {
    transactions,
    paymentModes,
    theme,
    settings,
    stats,
    groupedTransactions,
    toggleTheme,
    addTransaction,
    deleteTransaction,
    updateNecessity,
    updateTransaction,
    updatePaymentModes,
    updateSettings,
  } = useBudgly();

  const [activeTab, setActiveTab] = useState<'transactions' | 'dashboard'>('transactions');
  const [showSettings, setShowSettings] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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
            onClick={() => setActiveTab('transactions')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === 'transactions'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="w-4 h-4" />
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === 'dashboard'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </button>
        </div>

        {activeTab === 'transactions' ? (
          <>
            <section className="py-6 border-b border-border">
              <StatsBar stats={stats} currencySymbol={settings.currencySymbol} />
            </section>

            <section className="py-6 border-b border-border">
              <TransactionInput 
                paymentModes={paymentModes} 
                currencySymbol={settings.currencySymbol}
                onAdd={addTransaction} 
              />
            </section>

            <section className="py-6">
              <TransactionList
                groupedTransactions={groupedTransactions}
                currencySymbol={settings.currencySymbol}
                onDelete={deleteTransaction}
                onEdit={setEditingTransaction}
                onUpdateNecessity={updateNecessity}
              />
            </section>
          </>
        ) : (
          <Dashboard transactions={transactions} currencySymbol={settings.currencySymbol} />
        )}
      </div>

      {/* AI Chat FAB */}
      <button
        onClick={() => setShowAIChat(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground 
                   shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Dialogs */}
      {showSettings && (
        <SettingsDialog
          settings={settings}
          paymentModes={paymentModes}
          transactions={transactions}
          onSaveSettings={updateSettings}
          onSavePaymentModes={updatePaymentModes}
          onImportTransactions={(newTransactions) => {
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

      {showAIChat && (
        <AIChatDialog
          apiKey={settings.geminiApiKey}
          transactions={transactions}
          currencySymbol={settings.currencySymbol}
          onClose={() => setShowAIChat(false)}
        />
      )}
    </div>
  );
};

export default Index;
