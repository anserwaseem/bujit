import { useState, useCallback, useMemo } from 'react';
import { Plus, Check, Minus, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { parseInput } from '@/lib/parser';
import { PaymentMode, Transaction, NecessityType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface TransactionInputProps {
  paymentModes: PaymentMode[];
  currencySymbol: string;
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
}

export function TransactionInput({ paymentModes, currencySymbol, onAdd }: TransactionInputProps) {
  const [input, setInput] = useState('');
  const [isIncome, setIsIncome] = useState(false);
  const [selectedNecessity, setSelectedNecessity] = useState<NecessityType>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const parsed = useMemo(() => parseInput(input, paymentModes), [input, paymentModes]);

  const handleSubmit = useCallback(() => {
    if (!parsed.isValid || !parsed.amount) return;

    onAdd({
      date: selectedDate.toISOString(),
      reason: parsed.reason,
      amount: parsed.amount,
      paymentMode: parsed.paymentMode,
      type: isIncome ? 'income' : 'expense',
      necessity: isIncome ? null : selectedNecessity,
    });

    setInput('');
    setSelectedNecessity(null);
    setSelectedDate(new Date());
  }, [parsed, isIncome, selectedNecessity, selectedDate, onAdd]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && parsed.isValid) {
      handleSubmit();
    }
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-4">
      {/* Type Toggle - More intuitive with labels */}
      <div className="flex rounded-xl bg-muted p-1">
        <button
          onClick={() => setIsIncome(false)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
            !isIncome 
              ? "bg-expense/20 text-expense shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Minus className="w-4 h-4" />
          Expense
        </button>
        <button
          onClick={() => setIsIncome(true)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
            isIncome 
              ? "bg-income/20 text-income shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Plus className="w-4 h-4" />
          Income
        </button>
      </div>

      {/* Date Selector - Simple pill style */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <CalendarIcon className="w-3.5 h-3.5" />
            {isToday ? 'Today' : format(selectedDate, 'MMM d, yyyy')}
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

      {/* Main Input */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="chai JC 50"
          className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-lg font-mono 
                     placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 
                     focus:ring-primary/30 focus:border-primary transition-all pr-14"
        />
        <button
          onClick={handleSubmit}
          disabled={!parsed.isValid}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-lg transition-all",
            parsed.isValid
              ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          <Check className="w-5 h-5" />
        </button>
      </div>

      {/* Live Preview */}
      {input.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className={cn(
              "text-xs uppercase tracking-wider font-medium",
              isIncome ? "text-income" : "text-expense"
            )}>
              {isIncome ? '+ Income' : '− Expense'}
            </span>
            {parsed.isValid && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <Check className="w-3 h-3" /> Ready
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Reason</p>
              <p className={cn(
                "font-medium capitalize truncate",
                parsed.reason ? "text-foreground" : "text-muted-foreground"
              )}>
                {parsed.reason || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Mode</p>
              <p className="font-medium text-foreground">{parsed.paymentMode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Amount</p>
              <p className={cn(
                "font-mono font-semibold",
                parsed.amount 
                  ? (isIncome ? "text-income" : "text-expense") 
                  : "text-muted-foreground"
              )}>
                {parsed.amount ? `${currencySymbol}${parsed.amount.toLocaleString('en-PK')}` : '—'}
              </p>
            </div>
          </div>

          {/* Necessity Pills - only for expenses */}
          {!isIncome && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <button
                onClick={() => setSelectedNecessity(selectedNecessity === 'need' ? null : 'need')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  selectedNecessity === 'need'
                    ? "bg-need/20 text-need ring-1 ring-need/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-need" />
                Need
              </button>
              <button
                onClick={() => setSelectedNecessity(selectedNecessity === 'want' ? null : 'want')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  selectedNecessity === 'want'
                    ? "bg-want/20 text-want ring-1 ring-want/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-want" />
                Want
              </button>
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground text-center">
        Type: <span className="font-mono text-foreground/70">reason</span> <span className="font-mono text-foreground/70">mode</span> <span className="font-mono text-foreground/70">amount</span>
      </p>
    </div>
  );
}