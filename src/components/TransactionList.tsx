import { Transaction, NecessityType } from '@/lib/types';
import { TransactionCard } from './TransactionCard';
import { getRelativeDate } from '@/lib/parser';
import { Receipt, Sparkles, TrendingUp, Zap, ChevronDown, Search, X, SlidersHorizontal, ChevronUp, Calendar } from 'lucide-react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';



interface TransactionListProps {
  groupedTransactions: [string, { transactions: Transaction[], dayTotal: number }][];
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onUpdateNecessity: (id: string, necessity: NecessityType) => void;
  onDuplicate?: (transaction: Transaction) => Transaction | void;
}

// Animated empty state tips
const emptyStateTips = [
  { icon: Zap, text: "Type 'Coffee CC 150' to add an expense" },
  { icon: Sparkles, text: "Use voice input for hands-free entry" },
  { icon: TrendingUp, text: "Categorize as Need or Want to track habits" },
];

type GroupMode = 'day' | 'month' | 'year';
type DatePreset = 'all' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

const ITEMS_PER_PAGE = 20;

function getDateRangeFromPreset(preset: DatePreset): { start: Date | null; end: Date | null } {
  const now = new Date();
  
  switch (preset) {
    case 'all':
      return { start: null, end: null };
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    case 'last7days':
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case 'last30days':
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case 'thisMonth':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'lastMonth':
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case 'thisYear':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'lastYear':
      const lastYear = subYears(now, 1);
      return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
    case 'custom':
      return { start: null, end: null };
    default:
      return { start: null, end: null };
  }
}

export function TransactionList({ 
  groupedTransactions, 
  currencySymbol,
  onDelete, 
  onEdit,
  onUpdateNecessity,
  onDuplicate,
}: TransactionListProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [groupMode, setGroupMode] = useState<GroupMode>('day');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [necessityFilter, setNecessityFilter] = useState<'all' | 'need' | 'want' | 'uncategorized'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Date range filter
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  // Virtualization
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Rotate tips every 4 seconds
  useEffect(() => {
    if (groupedTransactions.length > 0) return;
    
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % emptyStateTips.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [groupedTransactions.length]);

  // Scroll to top visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Infinite scroll with Intersection Observer
  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  }, []);

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    if (!loadMoreElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(loadMoreElement);

    return () => observer.disconnect();
  }, [loadMore]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery, typeFilter, necessityFilter, datePreset, customStartDate, customEndDate]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Get date range based on preset or custom
  const dateRange = useMemo(() => {
    if (datePreset === 'custom') {
      return {
        start: customStartDate ? startOfDay(customStartDate) : null,
        end: customEndDate ? endOfDay(customEndDate) : null,
      };
    }
    return getDateRangeFromPreset(datePreset);
  }, [datePreset, customStartDate, customEndDate]);

  // Filter transactions first (including date range)
  const filteredGroupedTransactions = useMemo(() => {
    return groupedTransactions.map(([date, { transactions, dayTotal }]) => {
      const filtered = transactions.filter(t => {
        // Date range filter
        if (dateRange.start || dateRange.end) {
          const txDate = new Date(t.date);
          if (dateRange.start && txDate < dateRange.start) return false;
          if (dateRange.end && txDate > dateRange.end) return false;
        }
        
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesReason = t.reason.toLowerCase().includes(query);
          const matchesPaymentMode = t.paymentMode.toLowerCase().includes(query);
          if (!matchesReason && !matchesPaymentMode) return false;
        }
        
        // Type filter
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        
        // Necessity filter (only for expenses)
        if (necessityFilter !== 'all') {
          if (t.type !== 'expense') return false;
          if (necessityFilter === 'uncategorized' && t.necessity !== null) return false;
          if (necessityFilter !== 'uncategorized' && t.necessity !== necessityFilter) return false;
        }
        
        return true;
      });
      
      const filteredTotal = filtered
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      return [date, { transactions: filtered, dayTotal: filteredTotal }] as [string, { transactions: Transaction[], dayTotal: number }];
    }).filter(([, { transactions }]) => transactions.length > 0);
  }, [groupedTransactions, searchQuery, typeFilter, necessityFilter, dateRange]);

  // Regroup transactions based on mode
  const regroupedTransactions = useMemo(() => {
    if (groupMode === 'day') {
      // Default day grouping - expand most recent by default
      if (expandedGroups.size === 0 && filteredGroupedTransactions.length > 0) {
        setExpandedGroups(new Set([filteredGroupedTransactions[0][0]]));
      }
      return filteredGroupedTransactions;
    }

    // Flatten all transactions
    const allTransactions = filteredGroupedTransactions.flatMap(([, { transactions }]) => transactions);
    
    // Group by month or year
    const grouped: Record<string, { transactions: Transaction[], dayTotal: number }> = {};
    
    allTransactions.forEach(t => {
      const date = new Date(t.date);
      const key = groupMode === 'month' 
        ? format(date, 'yyyy-MM') 
        : format(date, 'yyyy');
      
      if (!grouped[key]) {
        grouped[key] = { transactions: [], dayTotal: 0 };
      }
      grouped[key].transactions.push(t);
      if (t.type === 'expense') {
        grouped[key].dayTotal += t.amount;
      }
    });

    const result = Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
    
    // Expand most recent by default when switching modes
    if (result.length > 0 && !expandedGroups.has(result[0][0])) {
      setExpandedGroups(new Set([result[0][0]]));
    }
    
    return result;
  }, [filteredGroupedTransactions, groupMode]);

  // Virtualized (paginated) transactions
  const visibleTransactions = useMemo(() => {
    return regroupedTransactions.slice(0, visibleCount);
  }, [regroupedTransactions, visibleCount]);

  const hasMore = visibleCount < regroupedTransactions.length;
  const totalFilteredCount = filteredGroupedTransactions.reduce((sum, [, { transactions }]) => sum + transactions.length, 0);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getGroupLabel = (key: string) => {
    if (groupMode === 'day') {
      return getRelativeDate(key);
    }
    if (groupMode === 'month') {
      const [year, month] = key.split('-');
      return format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy');
    }
    return key; // year
  };

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

  const hasActiveFilters = searchQuery || typeFilter !== 'all' || necessityFilter !== 'all' || datePreset !== 'all';

  return (
    <div className="space-y-3" ref={listRef}>
      {/* Divider with Filter Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
            "border border-border/50 hover:border-border",
            showFilters || hasActiveFilters
              ? "bg-primary/10 text-primary border-primary/30" 
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </button>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Collapsible Filter Panel */}
      <Collapsible open={showFilters}>
        <CollapsibleContent>
          <div className="space-y-3 p-3 bg-muted/30 rounded-2xl border border-border/50 animate-fade-in">
            {/* Date Range + Search Row */}
            <div className="flex items-center gap-2">
              {/* Date Range Preset */}
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                <SelectTrigger className="w-auto min-w-[120px] h-9 text-xs rounded-xl bg-background border-border/50">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map(preset => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 h-9 text-sm bg-background rounded-xl"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Custom Date Range Pickers */}
            {datePreset === 'custom' && (
              <div className="flex items-center gap-2">
                <Popover open={showStartPicker} onOpenChange={setShowStartPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 h-9 justify-start text-left text-xs font-normal rounded-xl",
                        !customStartDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-3.5 w-3.5" />
                      {customStartDate ? format(customStartDate, "MMM d, yyyy") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customStartDate}
                      onSelect={(date) => {
                        setCustomStartDate(date);
                        setShowStartPicker(false);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <span className="text-xs text-muted-foreground">to</span>

                <Popover open={showEndPicker} onOpenChange={setShowEndPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 h-9 justify-start text-left text-xs font-normal rounded-xl",
                        !customEndDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-3.5 w-3.5" />
                      {customEndDate ? format(customEndDate, "MMM d, yyyy") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customEndDate}
                      onSelect={(date) => {
                        setCustomEndDate(date);
                        setShowEndPicker(false);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            
            {/* Filters Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Group Mode Toggle - Improved Design */}
              <div className="flex p-1 bg-background rounded-xl border border-border/50">
                {(['day', 'month', 'year'] as GroupMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => {
                      setGroupMode(mode);
                      setExpandedGroups(new Set());
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                      groupMode === mode 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                <SelectTrigger className="w-auto min-w-[90px] h-8 text-xs rounded-xl bg-background border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>

              {/* Necessity Filter */}
              <Select value={necessityFilter} onValueChange={(v) => setNecessityFilter(v as typeof necessityFilter)}>
                <SelectTrigger className="w-auto min-w-[100px] h-8 text-xs rounded-xl bg-background border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="need">Needs</SelectItem>
                  <SelectItem value="want">Wants</SelectItem>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('all');
                    setNecessityFilter('all');
                    setDatePreset('all');
                    setCustomStartDate(undefined);
                    setCustomEndDate(undefined);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            {/* Results count */}
            <div className="text-xs text-muted-foreground text-center">
              Showing {totalFilteredCount} transaction{totalFilteredCount !== 1 ? 's' : ''}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Transaction Groups */}
      <div className="space-y-2">
        {visibleTransactions.map(([key, { transactions, dayTotal }], groupIdx) => {
          const isExpanded = expandedGroups.has(key);
          const groupIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
          const groupExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
          const groupNet = groupIncome - groupExpense;
          
          return (
            <Collapsible
              key={key}
              open={isExpanded}
              onOpenChange={() => toggleGroup(key)}
              className="animate-slide-up"
              style={{ animationDelay: `${Math.min(groupIdx, 5) * 50}ms` }}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors group">
                  <div className="flex items-center gap-2">
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )} />
                    <span className="text-sm font-medium text-foreground">
                      {getGroupLabel(key)}
                    </span>
                    <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-background/50 rounded-md">
                      {transactions.length}
                    </span>
                  </div>
                  {groupIncome > 0 && groupExpense > 0 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <span 
                          className={cn(
                            "text-sm font-mono font-medium cursor-pointer hover:underline",
                            groupNet >= 0 ? "text-income" : "text-expense"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {groupNet >= 0 ? '+' : ''}{currencySymbol}{Math.abs(groupNet).toLocaleString('en-PK')}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-3" align="end">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Income</span>
                            <span className="text-sm font-mono font-medium text-income">
                              +{currencySymbol}{groupIncome.toLocaleString('en-PK')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Expenses</span>
                            <span className="text-sm font-mono font-medium text-expense">
                              −{currencySymbol}{groupExpense.toLocaleString('en-PK')}
                            </span>
                          </div>
                          <div className="h-px bg-border my-1" />
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-foreground">Net</span>
                            <span className={cn(
                              "text-sm font-mono font-semibold",
                              groupNet >= 0 ? "text-income" : "text-expense"
                            )}>
                              {groupNet >= 0 ? '+' : ''}{currencySymbol}{Math.abs(groupNet).toLocaleString('en-PK')}
                            </span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span 
                      className={cn(
                        "text-sm font-mono font-medium",
                        groupNet >= 0 ? "text-income" : "text-expense"
                      )}
                    >
                      {groupNet >= 0 ? '+' : ''}{currencySymbol}{Math.abs(groupNet).toLocaleString('en-PK')}
                    </span>
                  )}
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="space-y-1 pt-2">
                  {transactions.map((transaction, idx) => (
                    <div
                      key={transaction.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}
                    >
                      <TransactionCard
                        transaction={transaction}
                        currencySymbol={currencySymbol}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onUpdateNecessity={onUpdateNecessity}
                        onDuplicate={onDuplicate}
                        showDate={groupMode !== 'day'}
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {/* Load More Trigger - always render ref for observer */}
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {hasMore && (
            <div className="text-xs text-muted-foreground animate-pulse">
              Loading more...
            </div>
          )}
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-6 w-10 h-10 rounded-full bg-muted/90 backdrop-blur-sm 
                     border border-border shadow-lg hover:bg-muted transition-all 
                     flex items-center justify-center z-40 animate-fade-in"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5 text-foreground" />
        </button>
      )}
    </div>
  );
}