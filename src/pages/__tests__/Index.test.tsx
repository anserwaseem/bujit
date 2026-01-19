import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import type { Transaction } from "@/lib/types";
import Index from "../Index";

// Mock the hooks
vi.mock("@/hooks/useBujit", () => ({
  useBujit: () => ({
    transactions: [],
    paymentModes: [
      { id: "1", name: "Cash", shorthand: "C" },
      { id: "2", name: "Credit Card", shorthand: "CC" },
    ],
    theme: "dark",
    settings: { currency: "PKR", currencySymbol: "Rs." },
    quickAddSuggestions: [],
    streakData: { noExpenseStreak: 0, spendingStreak: 0 },
    toggleTheme: vi.fn(),
    addTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    updateNecessity: vi.fn(),
    updateTransaction: vi.fn(),
    updatePaymentModes: vi.fn(),
    updateSettings: vi.fn(),
  }),
}));

vi.mock("@/hooks/useFilters.tsx", () => ({
  FilterProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useFilters: () => ({
    getFilteredTransactions: (transactions: Transaction[]) => transactions,
    filters: {
      timePeriod: "thisMonth",
      searchQuery: "",
      typeFilter: "all",
      necessityFilter: "all",
    },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("Index - Mobile Features", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset URL
    window.history.replaceState({}, "", "/");
    vi.clearAllMocks();
  });

  it("should handle dashboard shortcut action", async () => {
    window.history.replaceState({}, "", "/?action=dashboard");

    render(
      <BrowserRouter>
        <Index />
      </BrowserRouter>
    );

    // Should switch to dashboard tab
    await waitFor(() => {
      const dashboardButton = screen.getByText("Dashboard");
      expect(dashboardButton).toBeInTheDocument();
    });

    // URL should be cleaned up
    expect(window.location.search).toBe("");
  });

  it("should handle add-expense shortcut action", async () => {
    window.history.replaceState({}, "", "/?action=add-expense");

    render(
      <BrowserRouter>
        <Index />
      </BrowserRouter>
    );

    // Should switch to transactions tab
    await waitFor(() => {
      const transactionsButton = screen.getByText("Transactions");
      expect(transactionsButton).toBeInTheDocument();
    });

    // URL should be cleaned up
    expect(window.location.search).toBe("");
  });

  it("should handle shared text from share target", async () => {
    window.history.replaceState({}, "", "/?text=Coffee%20CC%20150");

    render(
      <BrowserRouter>
        <Index />
      </BrowserRouter>
    );

    // Should normalize and pre-fill the input
    await waitFor(() => {
      expect(window.location.search).toBe("");
    });
  });

  it("should handle shared title from share target", async () => {
    window.history.replaceState({}, "", "/?title=Lunch%20500");

    render(
      <BrowserRouter>
        <Index />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(window.location.search).toBe("");
    });
  });

  it("should clean up URL after processing", async () => {
    window.history.replaceState({}, "", "/?action=dashboard&text=test");

    render(
      <BrowserRouter>
        <Index />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(window.location.search).toBe("");
    });
  });
});
