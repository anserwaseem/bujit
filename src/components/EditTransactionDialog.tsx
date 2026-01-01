import { useState } from 'react';
import { X } from 'lucide-react';
import { Transaction, NecessityType, PaymentMode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EditTransactionDialogProps {
  transaction: Transaction;
  paymentModes: PaymentMode[];
  currencySymbol: string;
  onSave: (id: string, updates: Partial<Transaction>) => void;
  onClose: () => void;
}

export function EditTransactionDialog({
  transaction,
  paymentModes,
  currencySymbol,
  onSave,
  onClose,
}: EditTransactionDialogProps) {
  const [reason, setReason] = useState(transaction.reason);
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [paymentMode, setPaymentMode] = useState(transaction.paymentMode);
  const [necessity, setNecessity] = useState<NecessityType>(transaction.necessity);
  const [type, setType] = useState(transaction.type);

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (!reason.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    onSave(transaction.id, {
      reason: reason.trim(),
      amount: parsedAmount,
      paymentMode,
      necessity,
      type,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Edit Transaction</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Reason */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Description</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Amount ({currencySymbol})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 font-mono
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Type</label>
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "flex-1 py-2 rounded-lg font-medium capitalize transition-all",
                    type === t
                      ? t === 'expense'
                        ? "bg-expense/20 text-expense ring-1 ring-expense/30"
                        : "bg-income/20 text-income ring-1 ring-income/30"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {paymentModes.map((mode) => (
                <option key={mode.id} value={mode.name}>
                  {mode.name}
                </option>
              ))}
            </select>
          </div>

          {/* Necessity */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Category</label>
            <div className="flex gap-2">
              <button
                onClick={() => setNecessity(necessity === 'need' ? null : 'need')}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  necessity === 'need'
                    ? "bg-need/20 text-need ring-1 ring-need/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-need" />
                Need
              </button>
              <button
                onClick={() => setNecessity(necessity === 'want' ? null : 'want')}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  necessity === 'want'
                    ? "bg-want/20 text-want ring-1 ring-want/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-want" />
                Want
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-medium bg-muted text-muted-foreground 
                       hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground 
                       hover:opacity-90 transition-opacity"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
