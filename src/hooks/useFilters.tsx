/* eslint-disable react-refresh/only-export-components */
import {
  useState,
  useMemo,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { Transaction } from "@/lib/types";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  subYears,
} from "date-fns";

export type TimePeriod =
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"
  | "allTime"
  | "custom";

export type TypeFilter = "all" | "expense" | "income";
export type NecessityFilter = "all" | "need" | "want" | "uncategorized";

interface FilterState {
  timePeriod: TimePeriod;
  customStartDate: Date | undefined;
  customEndDate: Date | undefined;
  searchQuery: string;
  typeFilter: TypeFilter;
  necessityFilter: NecessityFilter;
}

const DEFAULT_FILTERS: FilterState = {
  timePeriod: "thisMonth",
  customStartDate: undefined,
  customEndDate: undefined,
  searchQuery: "",
  typeFilter: "all",
  necessityFilter: "all",
};

function getDateRangeForPeriod(
  period: TimePeriod,
  customStart?: Date,
  customEnd?: Date
): { start: Date | null; end: Date | null } {
  const now = new Date();
  switch (period) {
    case "thisMonth":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "lastMonth": {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case "thisYear":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "lastYear": {
      const lastYear = subYears(now, 1);
      return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
    }
    case "allTime":
      return { start: null, end: null };
    case "custom":
      return {
        start: customStart ? startOfDay(customStart) : null,
        end: customEnd ? endOfDay(customEnd) : null,
      };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

// Create filter context
interface FilterContextType {
  filters: FilterState;
  setTimePeriod: (period: TimePeriod) => void;
  setCustomStartDate: (date: Date | undefined) => void;
  setCustomEndDate: (date: Date | undefined) => void;
  setSearchQuery: (query: string) => void;
  setTypeFilter: (filter: TypeFilter) => void;
  setNecessityFilter: (filter: NecessityFilter) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  getFilteredTransactions: (transactions: Transaction[]) => Transaction[];
}

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const setTimePeriod = useCallback((period: TimePeriod) => {
    setFilters((prev) => ({
      ...prev,
      timePeriod: period,
      // Clear custom dates if not using custom period
      customStartDate: period === "custom" ? prev.customStartDate : undefined,
      customEndDate: period === "custom" ? prev.customEndDate : undefined,
    }));
  }, []);

  const setCustomStartDate = useCallback((date: Date | undefined) => {
    setFilters((prev) => ({ ...prev, customStartDate: date }));
  }, []);

  const setCustomEndDate = useCallback((date: Date | undefined) => {
    setFilters((prev) => ({ ...prev, customEndDate: date }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const setTypeFilter = useCallback((filter: TypeFilter) => {
    setFilters((prev) => ({ ...prev, typeFilter: filter }));
  }, []);

  const setNecessityFilter = useCallback((filter: NecessityFilter) => {
    setFilters((prev) => ({ ...prev, necessityFilter: filter }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.timePeriod !== DEFAULT_FILTERS.timePeriod ||
      filters.searchQuery !== DEFAULT_FILTERS.searchQuery ||
      filters.typeFilter !== DEFAULT_FILTERS.typeFilter ||
      filters.necessityFilter !== DEFAULT_FILTERS.necessityFilter ||
      filters.customStartDate !== undefined ||
      filters.customEndDate !== undefined
    );
  }, [filters]);

  const getFilteredTransactions = useCallback(
    (transactions: Transaction[]): Transaction[] => {
      const { start, end } = getDateRangeForPeriod(
        filters.timePeriod,
        filters.customStartDate,
        filters.customEndDate
      );

      return transactions.filter((t) => {
        // Date range filter
        if (start || end) {
          const txDate = new Date(t.date);
          if (start && txDate < start) return false;
          if (end && txDate > end) return false;
        }

        // Search filter (case-insensitive contains)
        if (filters.searchQuery.trim()) {
          const searchLower = filters.searchQuery.toLowerCase();
          const reasonLower = t.reason.toLowerCase();
          const paymentModeLower = t.paymentMode.toLowerCase();
          if (
            !reasonLower.includes(searchLower) &&
            !paymentModeLower.includes(searchLower)
          )
            return false;
        }

        // Type filter
        if (filters.typeFilter !== "all" && t.type !== filters.typeFilter)
          return false;

        // Necessity filter (only for expenses)
        if (filters.necessityFilter !== "all") {
          if (t.type !== "expense") return false;
          if (
            filters.necessityFilter === "uncategorized" &&
            t.necessity !== null
          )
            return false;
          if (
            filters.necessityFilter !== "uncategorized" &&
            t.necessity !== filters.necessityFilter
          )
            return false;
        }

        return true;
      });
    },
    [filters]
  );

  const value: FilterContextType = {
    filters,
    setTimePeriod,
    setCustomStartDate,
    setCustomEndDate,
    setSearchQuery,
    setTypeFilter,
    setNecessityFilter,
    clearFilters,
    hasActiveFilters,
    getFilteredTransactions,
  };

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within FilterProvider");
  }
  return context;
}
