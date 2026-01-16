import { useState } from "react";
import { X, Calendar, Search, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  useFilters,
  type TimePeriod,
  type TypeFilter,
  type NecessityFilter,
} from "@/hooks/useFilters.tsx";

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  thisMonth: "This Month",
  lastMonth: "Last Month",
  thisYear: "This Year",
  lastYear: "Last Year",
  allTime: "All Time",
  custom: "Custom Range",
};

interface FilterButtonProps {
  onClick: () => void;
}

export function FilterButton({ onClick }: FilterButtonProps) {
  const { filters, hasActiveFilters } = useFilters();

  // Count active filters for badge
  const activeFilterCount = [
    filters.timePeriod !== "thisMonth",
    filters.searchQuery.trim() !== "",
    filters.typeFilter !== "all",
    filters.necessityFilter !== "all",
    filters.customStartDate !== undefined,
    filters.customEndDate !== undefined,
  ].filter(Boolean).length;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-auto h-10 px-2.5 bg-muted border-0 rounded-lg hover:bg-muted/80 focus:ring-0 gap-1 flex items-center justify-center relative transition-colors",
        hasActiveFilters && "bg-primary/10 hover:bg-primary/20"
      )}
    >
      <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
      {activeFilterCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">
          {activeFilterCount}
        </span>
      )}
    </button>
  );
}

interface FilterContentProps {
  isOpen: boolean;
}

export function FilterContent({ isOpen }: FilterContentProps) {
  const {
    filters,
    setTimePeriod,
    setCustomStartDate,
    setCustomEndDate,
    setSearchQuery,
    setTypeFilter,
    setNecessityFilter,
    clearFilters,
    hasActiveFilters,
  } = useFilters();

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleClearFilters = () => {
    clearFilters();
  };

  if (!isOpen) return null;

  return (
    <div className="w-full mt-3 p-4 bg-muted/30 rounded-xl border border-border/50 space-y-4">
      {/* Time Period */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Time Period
        </label>
        <Select
          value={filters.timePeriod}
          onValueChange={(v) => {
            setTimePeriod(v as TimePeriod);
          }}
        >
          <SelectTrigger className="w-full h-10 text-sm rounded-xl bg-background border-border/50">
            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TIME_PERIOD_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Range Pickers */}
        {filters.timePeriod === "custom" && (
          <div className="flex items-center gap-2 pt-2">
            <Popover open={showStartPicker} onOpenChange={setShowStartPicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 h-10 justify-start text-left text-sm font-normal rounded-xl",
                    !filters.customStartDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {filters.customStartDate
                    ? format(filters.customStartDate, "MMM d, yyyy")
                    : "From date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={filters.customStartDate}
                  onSelect={(date) => {
                    setCustomStartDate(date);
                    setShowStartPicker(false);
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <span className="text-sm text-muted-foreground">to</span>

            <Popover open={showEndPicker} onOpenChange={setShowEndPicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 h-10 justify-start text-left text-sm font-normal rounded-xl",
                    !filters.customEndDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {filters.customEndDate
                    ? format(filters.customEndDate, "MMM d, yyyy")
                    : "To date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={filters.customEndDate}
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
      </div>

      {/* Search */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={filters.searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className="pl-9 pr-9 h-10 text-sm bg-background rounded-xl"
          />
          {filters.searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Type and Necessity Filters Row */}
      <div className="grid grid-cols-2 gap-2">
        {/* Type Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Type
          </label>
          <Select
            value={filters.typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v as TypeFilter);
            }}
          >
            <SelectTrigger className="w-full h-10 text-sm rounded-xl bg-background border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Necessity Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Necessity
          </label>
          <Select
            value={filters.necessityFilter}
            onValueChange={(v) => {
              setNecessityFilter(v as NecessityFilter);
            }}
          >
            <SelectTrigger className="w-full h-10 text-sm rounded-xl bg-background border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="need">Needs</SelectItem>
              <SelectItem value="want">Wants</SelectItem>
              <SelectItem value="uncategorized">Uncategorized</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={handleClearFilters}
          className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <X className="w-4 h-4" />
          Clear All Filters
        </button>
      )}
    </div>
  );
}
