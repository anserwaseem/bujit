import { Trash2, Pencil } from 'lucide-react';
import { Transaction, NecessityType } from '@/lib/types';
import { formatAmount } from '@/lib/parser';
import { cn } from '@/lib/utils';

interface TransactionCardProps {
  transaction: Transaction;
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onUpdateNecessity: (id: string, necessity: NecessityType) => void;
}

export function TransactionCard({ 
  transaction, 
  currencySymbol,
  onDelete, 
  onEdit,
  onUpdateNecessity 
}: TransactionCardProps) {
  const handleNecessityClick = (necessity: NecessityType) => {
    onUpdateNecessity(
      transaction.id,
      transaction.necessity === necessity ? null : necessity
    );
  };

  return (
    <div className="group flex items-center gap-3 p-3 rounded-lg bg-card/50 hover:bg-card 
                    border border-transparent hover:border-border transition-all animate-slide-up">
      {/* Necessity Indicator */}
      <button
        onClick={() => handleNecessityClick(transaction.necessity === 'need' ? 'want' : 'need')}
        className={cn(
          "w-2.5 h-2.5 rounded-full shrink-0 transition-all hover:scale-125",
          transaction.necessity === 'need' && "bg-need shadow-[0_0_8px_hsl(var(--need)/0.5)]",
          transaction.necessity === 'want' && "bg-want shadow-[0_0_8px_hsl(var(--want)/0.5)]",
          !transaction.necessity && "bg-muted-foreground/30 hover:bg-muted-foreground/50"
        )}
        title={transaction.necessity || 'Click to categorize'}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium capitalize truncate text-foreground">
          {transaction.reason}
        </p>
        <p className="text-xs text-muted-foreground">
          {transaction.paymentMode}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right">
        <p className={cn(
          "font-mono font-semibold",
          transaction.type === 'expense' ? "text-expense" : "text-income"
        )}>
          {transaction.type === 'expense' ? '-' : '+'}{currencySymbol}{formatAmount(transaction.amount)}
        </p>
      </div>

      {/* Edit */}
      <button
        onClick={() => onEdit(transaction)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground 
                   hover:text-primary hover:bg-primary/10 transition-all"
      >
        <Pencil className="w-4 h-4" />
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(transaction.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground 
                   hover:text-destructive hover:bg-destructive/10 transition-all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
