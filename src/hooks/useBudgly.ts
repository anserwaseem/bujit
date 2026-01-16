import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Transaction,
  PaymentMode,
  NecessityType,
  AppSettings,
} from "@/lib/types";
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
} from "@/lib/storage";
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { isOnline } from "@/lib/connectivity";
import {
  getGoogleSheetsConfig,
  saveGoogleSheetsConfig,
  type GoogleSheetsConfig,
} from "@/lib/storage";
import { syncTransactionsToSheet } from "@/lib/googleSheets";


const DEFAULT_MODES: PaymentMode[] = [
  { id: "1", name: "Debit Card", shorthand: "D" },
  { id: "2", name: "Cash", shorthand: "C" },
  { id: "3", name: "Credit Card", shorthand: "CC" },
];

const DEFAULT_SETTINGS: AppSettings = {
  currency: "PKR",
  currencySymbol: "Rs.",
};

// initialize state with localStorage values immediately (synchronous)
// this prevents delay from useEffect
// matches behavior of getTransactions() from storage.ts
function getInitialTransactions(): Transaction[] {
  try {
    const data = localStorage.getItem("bujit_transactions");
    if (!data) return [];

    const parsed = JSON.parse(data);
    // validate it's an array
    if (!Array.isArray(parsed)) {
      console.warn("Invalid transactions data, resetting to empty array");
      try {
        localStorage.setItem("bujit_transactions", JSON.stringify([]));
      } catch {
        // ignore cleanup errors
      }
      return [];
    }

    // basic validation - filter out invalid entries
    return parsed.filter(
      (t): t is Transaction =>
        t &&
        typeof t === "object" &&
        typeof t.id === "string" &&
        typeof t.amount === "number" &&
        typeof t.date === "string"
    );
  } catch (error) {
    console.error("Error loading transactions:", error);
    // if corrupted, clear and return empty
    try {
      localStorage.removeItem("bujit_transactions");
    } catch {
      // ignore cleanup errors
    }
    return [];
  }
}

function getInitialPaymentModes(): PaymentMode[] {
  try {
    const data = localStorage.getItem("bujit_payment_modes");
    return data ? JSON.parse(data) : DEFAULT_MODES;
  } catch {
    return DEFAULT_MODES;
  }
}

function getInitialTheme(): "light" | "dark" {
  try {
    const theme = localStorage.getItem("bujit_theme");
    return theme === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function getInitialSettings(): AppSettings {
  try {
    const data = localStorage.getItem("bujit_settings");
    return data
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useBudgly() {
  // initialize state synchronously with localStorage values
  // this prevents delay from useEffect and ensures immediate render
  const [transactions, setTransactions] = useState<Transaction[]>(
    getInitialTransactions
  );
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>(
    getInitialPaymentModes
  );
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const [settings, setSettings] = useState<AppSettings>(getInitialSettings);


  // auto-sync debounce timer
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ensure theme class is set (redundant but safe)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    saveTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  }, [theme]);

  // debounced auto-sync function
  const triggerAutoSync = useCallback((updatedTransactions: Transaction[]) => {
    // clear existing timer
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    // check if auto-sync is enabled and device is online
    const config = getGoogleSheetsConfig();
    if (!config?.autoSync || !config?.sheetId) {
      return; // auto-sync not enabled or no sheet configured
    }

    if (!isOnline()) {
      return; // silent failure when offline
    }

    // debounce sync by 500ms
    syncTimerRef.current = setTimeout(async () => {
      try {
        await syncTransactionsToSheet(updatedTransactions);
        // update last sync timestamp
        const currentConfig = getGoogleSheetsConfig();
        if (currentConfig) {
          const updatedConfig: GoogleSheetsConfig = {
            ...currentConfig,
            lastSyncTimestamp: Date.now(),
          };
          saveGoogleSheetsConfig(updatedConfig);
        }
      } catch {
        // silent failure - don't show errors for auto-sync
      }
    }, 500);
  }, []);

  const handleAddTransaction = useCallback(
    (transaction: Omit<Transaction, "id">) => {
      const newTransaction: Transaction = {
        ...transaction,
        id: crypto.randomUUID(),
      };
      const updated = addTransaction(newTransaction);
      setTransactions(updated);
      // trigger auto-sync if enabled and online
      triggerAutoSync(updated);
      return newTransaction;
    },
    [triggerAutoSync]
  );

  const handleDeleteTransaction = useCallback(
    (id: string) => {
      const updated = deleteTransaction(id);
      setTransactions(updated);
      // trigger auto-sync if enabled and online
      triggerAutoSync(updated);
    },
    [triggerAutoSync]
  );

  const handleUpdateNecessity = useCallback(
    (id: string, necessity: NecessityType) => {
      const updated = updateTransaction(id, { necessity });
      setTransactions(updated);
      // trigger auto-sync if enabled and online
      triggerAutoSync(updated);
    },
    [triggerAutoSync]
  );

  const handleUpdateTransaction = useCallback(
    (id: string, updates: Partial<Transaction>) => {
      const updated = updateTransaction(id, updates);
      setTransactions(updated);
      // trigger auto-sync if enabled and online
      triggerAutoSync(updated);
    },
    [triggerAutoSync]
  );

  const handleUpdatePaymentModes = useCallback((modes: PaymentMode[]) => {
    setPaymentModes(modes);
    savePaymentModes(modes);
  }, []);

  const handleUpdateSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  // Calculate stats from all transactions (filtering happens at higher level)
  const stats = useMemo(() => {
    const totalExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const needsTotal = transactions
      .filter((t) => t.type === "expense" && t.necessity === "need")
      .reduce((sum, t) => sum + t.amount, 0);
    const wantsTotal = transactions
      .filter((t) => t.type === "expense" && t.necessity === "want")
      .reduce((sum, t) => sum + t.amount, 0);
    const uncategorized = transactions
      .filter((t) => t.type === "expense" && t.necessity === null)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalExpenses,
      totalIncome,
      needsTotal,
      wantsTotal,
      uncategorized,
      transactionCount: transactions.length,
    };
  }, [transactions]);

  // Group transactions by date with daily totals
  const groupedTransactions = useMemo(() => {
    const groups: Record<
      string,
      { transactions: Transaction[]; dayTotal: number }
    > = {};
    transactions.forEach((t) => {
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
  }, [transactions]);

  // Quick add suggestions based on recent frequent transactions
  const quickAddSuggestions = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentTransactions = transactions.filter(
      (t) => t.type === "expense" && new Date(t.date) >= sevenDaysAgo
    );

    // Group by reason + paymentMode + amount
    const frequencyMap = new Map<
      string,
      { transaction: Transaction; count: number }
    >();
    recentTransactions.forEach((t) => {
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
      .filter((item) => item.count >= 2) // Only show if used 2+ times
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((item) => item.transaction);
  }, [transactions]);

  // cleanup sync timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

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
