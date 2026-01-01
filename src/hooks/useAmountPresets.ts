import { useMemo } from 'react';
import { Transaction } from '@/lib/types';

export function useAmountPresets(
  transactions: Transaction[],
  maxPresets: number = 5
): number[] {
  return useMemo(() => {
    // Get expenses from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentExpenses = transactions.filter(
      t => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo
    );
    
    if (recentExpenses.length === 0) {
      // Return default presets if no history
      return [50, 100, 250, 500, 1000];
    }
    
    // Count frequency of each amount
    const amountCounts = new Map<number, number>();
    recentExpenses.forEach(t => {
      const count = amountCounts.get(t.amount) || 0;
      amountCounts.set(t.amount, count + 1);
    });
    
    // Get most frequent amounts
    const frequentAmounts = Array.from(amountCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxPresets)
      .map(([amount]) => amount)
      .sort((a, b) => a - b); // Sort by value for display
    
    // If we don't have enough, fill with common amounts
    if (frequentAmounts.length < maxPresets) {
      const defaults = [50, 100, 250, 500, 1000];
      for (const def of defaults) {
        if (!frequentAmounts.includes(def) && frequentAmounts.length < maxPresets) {
          frequentAmounts.push(def);
        }
      }
      frequentAmounts.sort((a, b) => a - b);
    }
    
    return frequentAmounts;
  }, [transactions, maxPresets]);
}
