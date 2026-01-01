import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Plus, Check, Minus, CalendarIcon, Mic, MicOff, ChevronLeft, Sparkles } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { parseInput } from '@/lib/parser';
import { PaymentMode, Transaction, NecessityType } from '@/lib/types';
import { cn, haptic } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAutoComplete } from '@/hooks/useAutoComplete';
import { useAmountPresets } from '@/hooks/useAmountPresets';
import { useLearnedNecessity } from '@/hooks/useLearnedNecessity';
import { toast } from '@/hooks/use-toast';

interface TransactionInputProps {
  paymentModes: PaymentMode[];
  currencySymbol: string;
  quickAddSuggestions: Transaction[];
  transactions: Transaction[];
  todayCount: number;
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  onRepeatLast?: () => void;
  lastTransaction?: Transaction | null;
}

export function TransactionInput({ 
  paymentModes, 
  currencySymbol, 
  quickAddSuggestions,
  transactions,
  todayCount,
  onAdd,
  onRepeatLast,
  lastTransaction,
}: TransactionInputProps) {
  const [input, setInput] = useState('');
  const [isIncome, setIsIncome] = useState(false);
  const [selectedNecessity, setSelectedNecessity] = useState<NecessityType>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dateSwipeRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number>(0);

  const { isListening, isSupported, toggleListening } = useSpeechRecognition({
    onResult: (transcript) => {
      setInput(transcript);
      toast({
        title: "Voice captured",
        description: transcript,
      });
    },
    onError: (error) => {
      toast({
        title: "Voice input failed",
        description: error === 'not-allowed' ? 'Please enable microphone access' : 'Try again',
        variant: "destructive",
      });
    },
  });

  // Auto-complete suggestions
  const autoCompleteSuggestions = useAutoComplete(transactions, input);
  
  // Amount presets
  const amountPresets = useAmountPresets(transactions);
  
  // Learned necessity
  const { getSuggestedNecessity, recordNecessity, isLearned } = useLearnedNecessity(transactions);

  const handleQuickAdd = (suggestion: Transaction) => {
    haptic('light');
    setInput(`${suggestion.reason} ${suggestion.paymentMode} ${suggestion.amount}`);
    
    // Auto-apply learned necessity
    const suggested = getSuggestedNecessity(suggestion.reason);
    setSelectedNecessity(suggested || suggestion.necessity);
    setIsIncome(false);
    setShowAutoComplete(false);
  };

  const handleAutoCompleteSelect = (suggestion: { text: string; transaction: Transaction }) => {
    haptic('light');
    setInput(suggestion.text);
    
    // Auto-apply learned necessity
    const suggested = getSuggestedNecessity(suggestion.transaction.reason);
    setSelectedNecessity(suggested || suggestion.transaction.necessity);
    setShowAutoComplete(false);
  };

  const handleAmountPreset = (amount: number) => {
    haptic('light');
    const currentInput = input.trim();
    
    // If input has text but no amount, append the amount
    if (currentInput.length > 0) {
      // Check if there's already an amount at the end
      const parts = currentInput.split(' ');
      const lastPart = parts[parts.length - 1];
      if (!isNaN(Number(lastPart))) {
        // Replace existing amount
        parts[parts.length - 1] = amount.toString();
        setInput(parts.join(' '));
      } else {
        setInput(`${currentInput} ${amount}`);
      }
    } else {
      setInput(amount.toString());
    }
    
    inputRef.current?.focus();
  };

  const parsed = useMemo(() => parseInput(input, paymentModes), [input, paymentModes]);

  // Auto-suggest necessity when reason is parsed
  useEffect(() => {
    if (parsed.reason && !selectedNecessity) {
      const suggested = getSuggestedNecessity(parsed.reason);
      if (suggested) {
        setSelectedNecessity(suggested);
      }
    }
  }, [parsed.reason, selectedNecessity, getSuggestedNecessity]);

  const handleSubmit = useCallback(() => {
    if (!parsed.isValid || !parsed.amount) return;

    haptic('success');
    
    // Record the necessity for learning
    if (parsed.reason && selectedNecessity) {
      recordNecessity(parsed.reason, selectedNecessity);
    }
    
    onAdd({
      date: selectedDate.toISOString(),
      reason: parsed.reason,
      amount: parsed.amount,
      paymentMode: parsed.paymentMode,
      type: isIncome ? 'income' : 'expense',
      necessity: isIncome ? null : selectedNecessity,
    });

    // Show success toast
    toast({
      title: "Added!",
      description: `${currencySymbol}${parsed.amount.toLocaleString('en-PK')} for ${parsed.reason}`,
    });

    setInput('');
    setSelectedNecessity(null);
    setSelectedDate(new Date());
    setShowAutoComplete(false);
  }, [parsed, isIncome, selectedNecessity, selectedDate, onAdd, recordNecessity, currencySymbol]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && parsed.isValid) {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setShowAutoComplete(false);
    }
  };

  // Long press to repeat last transaction
  const handleLongPressStart = () => {
    if (!lastTransaction || !onRepeatLast) return;
    
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      haptic('success');
      onRepeatLast();
      
      toast({
        title: "Repeated!",
        description: `${currencySymbol}${lastTransaction.amount.toLocaleString('en-PK')} for ${lastTransaction.reason}`,
      });
      
      setTimeout(() => setIsLongPressing(false), 300);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Swipe to backdate
  const handleDateTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleDateTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    // Swipe left = go back one day
    if (diff > 50) {
      haptic('light');
      setSelectedDate(prev => subDays(prev, 1));
    }
    // Swipe right = go forward one day (but not past today)
    else if (diff < -50) {
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      if (nextDay <= new Date()) {
        haptic('light');
        setSelectedDate(nextDay);
      }
    }
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isYesterday = format(selectedDate, 'yyyy-MM-dd') === format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const getDateLabel = () => {
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return format(selectedDate, 'MMM d');
  };

  return (
    <div className="space-y-4">
      {/* Today Counter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Add Transaction</h2>
        <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
          Today: {todayCount} transaction{todayCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Quick Add Pills */}
      {quickAddSuggestions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {quickAddSuggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickAdd(suggestion)}
              className="shrink-0 px-3 py-1.5 rounded-full bg-muted text-sm font-medium 
                         text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors
                         active:scale-95"
            >
              {suggestion.reason} {currencySymbol}{suggestion.amount.toLocaleString('en-PK')}
            </button>
          ))}
        </div>
      )}

      {/* Amount Presets */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <span className="shrink-0 text-xs text-muted-foreground self-center mr-1">Quick:</span>
        {amountPresets.map((amount) => (
          <button
            key={amount}
            onClick={() => handleAmountPreset(amount)}
            className="shrink-0 px-2.5 py-1 rounded-md bg-secondary text-xs font-mono font-medium 
                       text-secondary-foreground hover:bg-secondary/80 transition-colors
                       active:scale-95"
          >
            {currencySymbol}{amount.toLocaleString('en-PK')}
          </button>
        ))}
      </div>

      {/* Type Toggle */}
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

      {/* Date Selector with Swipe */}
      <div className="flex items-center gap-2">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button 
              ref={dateSwipeRef}
              onTouchStart={handleDateTouchStart}
              onTouchEnd={handleDateTouchEnd}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              {getDateLabel()}
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
        
        {!isToday && (
          <button
            onClick={() => {
              haptic('light');
              setSelectedDate(subDays(selectedDate, 1));
            }}
            className="p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Go back one day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        
        <span className="text-xs text-muted-foreground">← swipe date to backdate</span>
      </div>

      {/* Main Input with Auto-Complete */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowAutoComplete(e.target.value.length >= 2);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowAutoComplete(input.length >= 2)}
          onBlur={() => setTimeout(() => setShowAutoComplete(false), 200)}
          placeholder="Grocery CC 9500"
          className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-lg font-mono 
                     placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 
                     focus:ring-primary/30 focus:border-primary transition-all pr-24"
        />
        
        {/* Auto-Complete Dropdown */}
        {showAutoComplete && autoCompleteSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in">
            {autoCompleteSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleAutoCompleteSelect(suggestion)}
                className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center justify-between gap-2"
              >
                <span className="font-medium capitalize truncate">{suggestion.transaction.reason}</span>
                <span className="text-sm text-muted-foreground font-mono shrink-0">
                  {suggestion.transaction.paymentMode} {currencySymbol}{suggestion.transaction.amount.toLocaleString('en-PK')}
                </span>
              </button>
            ))}
          </div>
        )}
        
        {/* Voice Input Button */}
        {isSupported && (
          <button
            onClick={toggleListening}
            className={cn(
              "absolute right-14 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all",
              isListening
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title={isListening ? "Stop listening" : "Voice input"}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}

        {/* Submit Button with Long-Press */}
        <button
          onClick={handleSubmit}
          onMouseDown={handleLongPressStart}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
          onTouchStart={handleLongPressStart}
          onTouchEnd={handleLongPressEnd}
          disabled={!parsed.isValid}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-lg transition-all",
            parsed.isValid
              ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
              : "bg-muted text-muted-foreground cursor-not-allowed",
            isLongPressing && "scale-110"
          )}
          title={lastTransaction ? "Tap to add, hold to repeat last" : "Add transaction"}
        >
          <Check className="w-5 h-5" />
        </button>
      </div>

      {/* Repeat Last Hint */}
      {lastTransaction && (
        <p className="text-xs text-muted-foreground text-center">
          Hold <span className="inline-flex items-center"><Check className="w-3 h-3 mx-0.5" /></span> to repeat: {lastTransaction.reason} {currencySymbol}{lastTransaction.amount.toLocaleString('en-PK')}
        </p>
      )}

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
              
              {/* Auto-learned indicator */}
              {parsed.reason && isLearned(parsed.reason) && selectedNecessity && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                  <Sparkles className="w-3 h-3" /> Auto-suggested
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground text-center">
        Type: <span className="font-mono text-foreground/70">reason</span> <span className="font-mono text-foreground/70">mode</span> <span className="font-mono text-foreground/70">amount</span>
        {isSupported && <span className="ml-2">• or tap mic to speak</span>}
      </p>
    </div>
  );
}
