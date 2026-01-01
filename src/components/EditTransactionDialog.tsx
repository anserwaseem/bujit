import { useState } from 'react';
import { X, CalendarIcon, Minus, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Transaction, NecessityType, PaymentMode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(transaction.date));
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (!reason.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    onSave(transaction.id, {
      reason: reason.trim(),
      amount: parsedAmount,
      paymentMode,
      necessity: type === 'income' ? null : necessity,
      type,
      date: selectedDate.toISOString(),
    });
    onClose();
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

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
          {/* Type Toggle */}
          <div className="flex rounded-xl bg-muted p-1">
            <button
              onClick={() => setType('expense')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                type === 'expense' 
                  ? "bg-expense/20 text-expense shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Minus className="w-4 h-4" />
              Expense
            </button>
            <button
              onClick={() => setType('income')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                type === 'income' 
                  ? "bg-income/20 text-income shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Plus className="w-4 h-4" />
              Income
            </button>
          </div>

          {/* Date Selector */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Date</label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-input border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors text-left">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  {isToday ? 'Today' : format(selectedDate, 'EEEE, MMM d, yyyy')}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setCalendarOpen(false);
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reason */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Description</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Amount ({currencySymbol})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 font-mono
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {paymentModes.map((mode) => (
                <option key={mode.id} value={mode.name}>
                  {mode.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category - Only show for expenses */}
          {type === 'expense' && (
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Category</label>
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
          )}
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
