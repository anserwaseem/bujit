import { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, PaymentMode, NecessityType, AppSettings } from '@/lib/types';
import {
  getTransactions,
  addTransaction,
  deleteTransaction,
  updateTransaction,
  getPaymentModes,
  savePaymentModes,
  getTheme,
  saveTheme,
  getSettings,
  saveSettings,
} from '@/lib/storage';

export function useBudgly() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [settings, setSettings] = useState<AppSettings>({
    currency: 'PKR',
    currencySymbol: 'Rs.',
    geminiApiKey: '',
  });

  // Load data on mount
  useEffect(() => {
    setTransactions(getTransactions());
    setPaymentModes(getPaymentModes());
    setSettings(getSettings());
    const savedTheme = getTheme();
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    saveTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }, [theme]);

  const handleAddTransaction = useCallback(
    (transaction: Omit<Transaction, 'id'>) => {
      const newTransaction: Transaction = {
        ...transaction,
        id: crypto.randomUUID(),
      };
      const updated = addTransaction(newTransaction);
      setTransactions(updated);
      return newTransaction;
    },
    []
  );

  const handleDeleteTransaction = useCallback((id: string) => {
    const updated = deleteTransaction(id);
    setTransactions(updated);
  }, []);

  const handleUpdateNecessity = useCallback((id: string, necessity: NecessityType) => {
    const updated = updateTransaction(id, { necessity });
    setTransactions(updated);
  }, []);

  const handleUpdateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    const updated = updateTransaction(id, updates);
    setTransactions(updated);
  }, []);

  const handleUpdatePaymentModes = useCallback((modes: PaymentMode[]) => {
    setPaymentModes(modes);
    savePaymentModes(modes);
  }, []);

  const handleUpdateSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyTransactions = transactions.filter(
      t => new Date(t.date) >= startOfMonth
    );

    const totalExpenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const needsTotal = monthlyTransactions
      .filter(t => t.type === 'expense' && t.necessity === 'need')
      .reduce((sum, t) => sum + t.amount, 0);
    const wantsTotal = monthlyTransactions
      .filter(t => t.type === 'expense' && t.necessity === 'want')
      .reduce((sum, t) => sum + t.amount, 0);
    const uncategorized = monthlyTransactions
      .filter(t => t.type === 'expense' && t.necessity === null)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalExpenses,
      totalIncome,
      needsTotal,
      wantsTotal,
      uncategorized,
      transactionCount: monthlyTransactions.length,
    };
  }, [transactions]);

  // Group transactions by date with daily totals
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, { transactions: Transaction[], dayTotal: number }> = {};
    transactions.forEach(t => {
      const dateKey = new Date(t.date).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = { transactions: [], dayTotal: 0 };
      }
      groups[dateKey].transactions.push(t);
      if (t.type === 'expense') {
        groups[dateKey].dayTotal += t.amount;
      }
    });
    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 10);
  }, [transactions]);

  // Quick add suggestions based on recent frequent transactions
  const quickAddSuggestions = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentTransactions = transactions.filter(
      t => t.type === 'expense' && new Date(t.date) >= sevenDaysAgo
    );

    // Group by reason + paymentMode + amount
    const frequencyMap = new Map<string, { transaction: Transaction; count: number }>();
    recentTransactions.forEach(t => {
      const key = `${t.reason.toLowerCase()}_${t.paymentMode}_${t.amount}`;
      const existing = frequencyMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        frequencyMap.set(key, { transaction: t, count: 1 });
      }
    });

    // Sort by frequency, return top 4
    return Array.from(frequencyMap.values())
      .filter(item => item.count >= 2) // Only show if used 2+ times
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map(item => item.transaction);
  }, [transactions]);

  return {
    transactions,
    paymentModes,
    theme,
    settings,
    stats,
    groupedTransactions,
    quickAddSuggestions,
    toggleTheme,
    addTransaction: handleAddTransaction,
    deleteTransaction: handleDeleteTransaction,
    updateNecessity: handleUpdateNecessity,
    updateTransaction: handleUpdateTransaction,
    updatePaymentModes: handleUpdatePaymentModes,
    updateSettings: handleUpdateSettings,
  };
}
