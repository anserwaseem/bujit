import { useState, useCallback, useMemo } from 'react';
import { Plus, Check } from 'lucide-react';
import { parseInput } from '@/lib/parser';
import { PaymentMode, Transaction, NecessityType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TransactionInputProps {
  paymentModes: PaymentMode[];
  currencySymbol: string;
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
}

export function TransactionInput({ paymentModes, currencySymbol, onAdd }: TransactionInputProps) {
  const [input, setInput] = useState('');
  const [selectedNecessity, setSelectedNecessity] = useState<NecessityType>(null);

  const parsed = useMemo(() => parseInput(input, paymentModes), [input, paymentModes]);

  const handleSubmit = useCallback(() => {
    if (!parsed.isValid || !parsed.amount) return;

    onAdd({
      date: new Date().toISOString(),
      reason: parsed.reason,
      amount: parsed.amount,
      paymentMode: parsed.paymentMode,
      type: 'expense',
      necessity: selectedNecessity,
    });

    setInput('');
    setSelectedNecessity(null);
  }, [parsed, selectedNecessity, onAdd]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && parsed.isValid) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Input */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="chai JC 50"
          className="w-full bg-card border border-border rounded-lg px-4 py-4 text-lg font-mono 
                     placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 
                     focus:ring-primary/30 focus:border-primary transition-all"
        />
        <button
          onClick={handleSubmit}
          disabled={!parsed.isValid}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md transition-all",
            parsed.isValid
              ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Live Preview */}
      {input.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Preview
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
                parsed.amount ? "text-expense" : "text-muted-foreground"
              )}>
                {parsed.amount ? `${currencySymbol}${parsed.amount.toLocaleString('en-PK')}` : '—'}
              </p>
            </div>
          </div>

          {/* Necessity Pills */}
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
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground text-center">
        Type: <span className="font-mono text-foreground/70">reason</span> <span className="font-mono text-foreground/70">mode</span> <span className="font-mono text-foreground/70">amount</span>
      </p>
    </div>
  );
}
