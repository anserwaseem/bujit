import { Transaction, NecessityType } from '@/lib/types';
import { TransactionCard } from './TransactionCard';
import { getRelativeDate } from '@/lib/parser';
import { Receipt } from 'lucide-react';

interface TransactionListProps {
  groupedTransactions: [string, { transactions: Transaction[], dayTotal: number }][];
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onUpdateNecessity: (id: string, necessity: NecessityType) => void;
}

export function TransactionList({ 
  groupedTransactions, 
  currencySymbol,
  onDelete, 
  onEdit,
  onUpdateNecessity 
}: TransactionListProps) {
  if (groupedTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Receipt className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No transactions yet</h3>
        <p className="text-sm text-muted-foreground max-w-[200px]">
          Add your first expense using the input above
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedTransactions.map(([dateKey, { transactions, dayTotal }]) => (
        <div key={dateKey} className="space-y-2">
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
            {transactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                currencySymbol={currencySymbol}
                onDelete={onDelete}
                onEdit={onEdit}
                onUpdateNecessity={onUpdateNecessity}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
