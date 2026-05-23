import { useCallback, useEffect, useRef, useState } from "react";
import { getRecurringRules, saveRecurringRules } from "@/lib/storage";
import { processDueRecurring } from "@/lib/recurring";
import type { RecurringRule, Transaction } from "@/lib/types";

interface UseRecurringOptions {
  onFire: (transactions: Omit<Transaction, "id">[]) => void;
}

export function useRecurring({ onFire }: UseRecurringOptions) {
  const [rules, setRules] = useState<RecurringRule[]>(() =>
    getRecurringRules()
  );
  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;

  // Persist on every change.
  useEffect(() => {
    saveRecurringRules(rules);
  }, [rules]);

  // Run due rules on mount (and whenever rules list changes).
  const processedRef = useRef(false);
  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;
    const { newTransactions, updatedRules } = processDueRecurring(
      getRecurringRules()
    );
    if (newTransactions.length > 0) {
      onFireRef.current(newTransactions);
      setRules(updatedRules);
    }
  }, []);

  const addRule = useCallback(
    (rule: Omit<RecurringRule, "id" | "active"> & { active?: boolean }) => {
      const newRule: RecurringRule = {
        ...rule,
        id: crypto.randomUUID(),
        active: rule.active ?? true,
      };
      setRules((prev) => [newRule, ...prev]);
      return newRule;
    },
    []
  );

  const updateRule = useCallback(
    (id: string, updates: Partial<RecurringRule>) => {
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    },
    []
  );

  const deleteRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggleRule = useCallback((id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  }, []);

  return { rules, addRule, updateRule, deleteRule, toggleRule };
}