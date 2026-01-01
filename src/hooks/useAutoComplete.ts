import { useMemo } from 'react';
import { Transaction } from '@/lib/types';

export interface AutoCompleteSuggestion {
  text: string;
  transaction: Transaction;
  matchScore: number;
}

export function useAutoComplete(
  transactions: Transaction[],
  input: string,
  maxSuggestions: number = 5
) {
  const suggestions = useMemo(() => {
    if (!input || input.length < 2) return [];
    
    const searchTerm = input.toLowerCase().trim();
    const seen = new Set<string>();
    const results: AutoCompleteSuggestion[] = [];
    
    // Sort by date (most recent first) to prioritize recent transactions
    const sortedTransactions = [...transactions]
      .filter(t => t.type === 'expense')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (const t of sortedTransactions) {
      const key = `${t.reason.toLowerCase()}_${t.paymentMode}_${t.amount}`;
      if (seen.has(key)) continue;
      
      const fullText = `${t.reason} ${t.paymentMode} ${t.amount}`;
      const lowerReason = t.reason.toLowerCase();
      
      // Match against reason (primary) or full text
      let matchScore = 0;
      
      // Exact prefix match on reason is highest score
      if (lowerReason.startsWith(searchTerm)) {
        matchScore = 100 - searchTerm.length; // Shorter matches = higher priority
      } 
      // Fuzzy match: contains the search term
      else if (lowerReason.includes(searchTerm)) {
        matchScore = 50;
      }
      // Full text contains search
      else if (fullText.toLowerCase().includes(searchTerm)) {
        matchScore = 25;
      }
      
      if (matchScore > 0) {
        seen.add(key);
        results.push({
          text: fullText,
          transaction: t,
          matchScore,
        });
      }
      
      if (results.length >= maxSuggestions * 2) break; // Get more than needed for sorting
    }
    
    // Sort by match score and return top results
    return results
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxSuggestions);
  }, [transactions, input, maxSuggestions]);

  return suggestions;
}
