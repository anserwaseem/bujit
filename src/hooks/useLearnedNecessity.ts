import { useCallback, useMemo } from 'react';
import { Transaction, NecessityType } from '@/lib/types';

const LEARNED_KEY = 'bujit_learned_necessity';

interface NecessityLearning {
  [reason: string]: {
    need: number;
    want: number;
    lastUsed: NecessityType;
  };
}

function getLearnedData(): NecessityLearning {
  try {
    const data = localStorage.getItem(LEARNED_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveLearnedData(data: NecessityLearning): void {
  localStorage.setItem(LEARNED_KEY, JSON.stringify(data));
}

export function useLearnedNecessity(transactions: Transaction[]) {
  // Learn from transaction history
  const learnFromTransactions = useCallback(() => {
    const learning: NecessityLearning = getLearnedData();
    
    transactions.forEach(t => {
      if (t.type === 'expense' && t.necessity && t.reason) {
        const key = t.reason.toLowerCase().trim();
        if (!learning[key]) {
          learning[key] = { need: 0, want: 0, lastUsed: null };
        }
        if (t.necessity === 'need') {
          learning[key].need++;
        } else if (t.necessity === 'want') {
          learning[key].want++;
        }
        learning[key].lastUsed = t.necessity;
      }
    });
    
    saveLearnedData(learning);
    return learning;
  }, [transactions]);

  // Get suggested necessity for a reason
  const getSuggestedNecessity = useCallback((reason: string): NecessityType => {
    const learning = getLearnedData();
    const key = reason.toLowerCase().trim();
    const data = learning[key];
    
    if (!data) return null;
    
    // If one category has 70%+ usage, suggest it
    const total = data.need + data.want;
    if (total < 2) return data.lastUsed; // Not enough data, use last
    
    const needPercent = data.need / total;
    if (needPercent >= 0.7) return 'need';
    if (needPercent <= 0.3) return 'want';
    
    // Otherwise, return the last used
    return data.lastUsed;
  }, []);

  // Record a new necessity choice
  const recordNecessity = useCallback((reason: string, necessity: NecessityType) => {
    if (!reason || !necessity) return;
    
    const learning = getLearnedData();
    const key = reason.toLowerCase().trim();
    
    if (!learning[key]) {
      learning[key] = { need: 0, want: 0, lastUsed: null };
    }
    
    if (necessity === 'need') {
      learning[key].need++;
    } else if (necessity === 'want') {
      learning[key].want++;
    }
    learning[key].lastUsed = necessity;
    
    saveLearnedData(learning);
  }, []);

  // Check if a reason has been learned
  const isLearned = useCallback((reason: string): boolean => {
    const learning = getLearnedData();
    const key = reason.toLowerCase().trim();
    const data = learning[key];
    return !!data && (data.need + data.want) >= 2;
  }, []);

  return {
    learnFromTransactions,
    getSuggestedNecessity,
    recordNecessity,
    isLearned,
  };
}
