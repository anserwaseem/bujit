import { Transaction, NecessityType } from '@/lib/types';
import { TransactionCard } from './TransactionCard';
import { getRelativeDate } from '@/lib/parser';
import { Receipt, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TransactionListProps {
  groupedTransactions: [string, { transactions: Transaction[], dayTotal: number }][];
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onUpdateNecessity: (id: string, necessity: NecessityType) => void;
  onDuplicate?: (transaction: Transaction) => void;
}

// Animated empty state tips
const emptyStateTips = [
  { icon: Zap, text: "Type 'Coffee CC 150' to add an expense" },
  { icon: Sparkles, text: "Use voice input for hands-free entry" },
  { icon: TrendingUp, text: "Categorize as Need or Want to track habits" },
];

export function TransactionList({ 
  groupedTransactions, 
  currencySymbol,
  onDelete, 
  onEdit,
  onUpdateNecessity,
  onDuplicate,
}: TransactionListProps) {
  const [tipIndex, setTipIndex] = useState(0);

  // Rotate tips every 4 seconds
  useEffect(() => {
    if (groupedTransactions.length > 0) return;
    
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % emptyStateTips.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [groupedTransactions.length]);

  if (groupedTransactions.length === 0) {
    const currentTip = emptyStateTips[tipIndex];
    const TipIcon = currentTip.icon;
    
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 animate-pulse-soft">
          <Receipt className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No transactions yet</h3>
        <p className="text-sm text-muted-foreground max-w-[280px] mb-8">
          Start tracking your expenses and income to see insights here
        </p>
        
        {/* Rotating tip */}
        <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-xl animate-fade-in" key={tipIndex}>
          <TipIcon className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm text-foreground">{currentTip.text}</p>
        </div>
        
        {/* Tip indicators */}
        <div className="flex gap-1.5 mt-4">
          {emptyStateTips.map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === tipIndex ? 'bg-primary w-4' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Double-tap hint - show only once */}
      {onDuplicate && (
        <p className="text-xs text-muted-foreground text-center pb-2">
          Double-tap any transaction to duplicate it for today
        </p>
      )}
      
      {groupedTransactions.map(([dateKey, { transactions, dayTotal }], groupIdx) => (
        <div 
          key={dateKey} 
          className="space-y-2 animate-slide-up"
          style={{ animationDelay: `${groupIdx * 50}ms` }}
        >
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-muted-foreground">
              {getRelativeDate(dateKey)}
            </h3>
            {dayTotal > 0 && (
              <span className="text-sm font-mono font-medium text-expense">
                −{currencySymbol}{dayTotal.toLocaleString('en-PK')}
              </span>
            )}
          </div>
          <div className="space-y-1">
            {transactions.map((transaction, idx) => (
              <div
                key={transaction.id}
                className="animate-slide-up"
                style={{ animationDelay: `${(groupIdx * 50) + (idx * 30)}ms` }}
              >
                <TransactionCard
                  transaction={transaction}
                  currencySymbol={currencySymbol}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onUpdateNecessity={onUpdateNecessity}
                  onDuplicate={onDuplicate}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
