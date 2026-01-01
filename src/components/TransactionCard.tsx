import { useRef, useCallback } from 'react';
import { Trash2, Pencil, Copy } from 'lucide-react';
import { Transaction, NecessityType } from '@/lib/types';
import { formatAmount } from '@/lib/parser';
import { cn, haptic } from '@/lib/utils';
import { SwipeableCard } from './SwipeableCard';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface TransactionCardProps {
  transaction: Transaction;
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onUpdateNecessity: (id: string, necessity: NecessityType) => void;
  onDuplicate?: (transaction: Transaction) => Transaction | void;
  showDate?: boolean;
}

export function TransactionCard({ 
  transaction, 
  currencySymbol,
  onDelete, 
  onEdit,
  onUpdateNecessity,
  onDuplicate,
  showDate = false,
}: TransactionCardProps) {
  const lastTapRef = useRef<number>(0);
  const doubleTapTimer = useRef<NodeJS.Timeout | null>(null);

  const handleNecessityClick = (necessity: NecessityType) => {
    haptic('light');
    onUpdateNecessity(
      transaction.id,
      transaction.necessity === necessity ? null : necessity
    );
  };

  const handleDelete = () => {
    haptic('warning');
    onDelete(transaction.id);
  };

  const handleEdit = () => {
    haptic('light');
    onEdit(transaction);
  };

  // Double-tap to duplicate
  const handleCardClick = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap detected
      if (doubleTapTimer.current) {
        clearTimeout(doubleTapTimer.current);
        doubleTapTimer.current = null;
      }
      
      if (onDuplicate) {
        haptic('success');
        const newTransaction = onDuplicate(transaction);
        toast({
          title: "Duplicated!",
          description: `${currencySymbol}${transaction.amount.toLocaleString('en-PK')} for ${transaction.reason}`,
          action: newTransaction ? (
            <button
              onClick={() => {
                onDelete(newTransaction.id);
                haptic('light');
              }}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
            >
              Undo
            </button>
          ) : undefined,
        });
      }
    }
    
    lastTapRef.current = now;
  }, [transaction, onDuplicate, onDelete, currencySymbol]);

  return (
    <SwipeableCard
      onSwipeLeft={handleDelete}
      onSwipeRight={handleEdit}
    >
      <div 
        onClick={handleCardClick}
        className="group flex items-center gap-3 p-3 rounded-lg bg-card/50 hover:bg-card 
                   border border-transparent hover:border-border transition-all animate-slide-up
                   cursor-pointer select-none"
      >
        {/* Necessity Indicator - Only show for expenses */}
        {transaction.type === 'expense' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNecessityClick(transaction.necessity === 'need' ? 'want' : 'need');
            }}
            className={cn(
              "w-2.5 h-2.5 rounded-full shrink-0 transition-all hover:scale-125",
              transaction.necessity === 'need' && "bg-need shadow-[0_0_8px_hsl(var(--need)/0.5)]",
              transaction.necessity === 'want' && "bg-want shadow-[0_0_8px_hsl(var(--want)/0.5)]",
              !transaction.necessity && "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            title={transaction.necessity || 'Click to categorize'}
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium capitalize truncate text-foreground">
            {transaction.reason}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{transaction.paymentMode}</span>
            {showDate && (
              <>
                <span>•</span>
                <span>{format(new Date(transaction.date), 'd MMM')}</span>
              </>
            )}
          </div>
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
          onClick={(e) => {
            e.stopPropagation();
            handleEdit();
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground 
                     hover:text-primary hover:bg-primary/10 transition-all"
        >
          <Pencil className="w-4 h-4" />
        </button>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground 
                     hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </SwipeableCard>
  );
}
