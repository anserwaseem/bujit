import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getTransactions,
  addTransaction,
  deleteTransaction,
  updateTransaction,
  getPaymentModes,
  savePaymentModes,
  getTheme,
  saveTheme,
  getSettings,
  saveSettings,
} from "../storage";
import type { Transaction, PaymentMode, AppSettings } from "../types";

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getTransactions", () => {
    it("should return empty array when no transactions exist", () => {
      expect(getTransactions()).toEqual([]);
    });

    it("should return transactions from localStorage", () => {
      const transactions: Transaction[] = [
        {
          id: "1",
          date: "2024-01-15",
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "2",
          date: "2024-01-16",
          reason: "lunch",
          amount: 250,
          paymentMode: "Debit Card",
          type: "expense",
          necessity: "need",
        },
      ];
      localStorage.setItem("bujit_transactions", JSON.stringify(transactions));
      expect(getTransactions()).toEqual(transactions);
    });

    it("should filter out invalid transactions", () => {
      const invalidData = [
        { id: "1", amount: 100 }, // missing required fields
        {
          id: "2",
          date: "2024-01-15",
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        null,
        "invalid",
      ];
      localStorage.setItem("bujit_transactions", JSON.stringify(invalidData));
      const result = getTransactions();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("should return empty array and clear storage on parse error", () => {
      localStorage.setItem("bujit_transactions", "invalid json");
      const result = getTransactions();
      expect(result).toEqual([]);
      expect(localStorage.getItem("bujit_transactions")).toBeNull();
    });

    it("should return empty array when data is not an array", () => {
      localStorage.setItem("bujit_transactions", JSON.stringify({ not: "array" }));
      const result = getTransactions();
      expect(result).toEqual([]);
    });
  });

  describe("addTransaction", () => {
    it("should add a new transaction", () => {
      const transaction: Transaction = {
        id: "1",
        date: "2024-01-15",
        reason: "coffee",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      };
      const result = addTransaction(transaction);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(transaction);
      expect(getTransactions()).toEqual([transaction]);
    });

    it("should prepend new transaction to existing ones", () => {
      const existing: Transaction = {
        id: "1",
        date: "2024-01-15",
        reason: "coffee",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      };
      localStorage.setItem("bujit_transactions", JSON.stringify([existing]));

      const newTransaction: Transaction = {
        id: "2",
        date: "2024-01-16",
        reason: "lunch",
        amount: 250,
        paymentMode: "Debit Card",
        type: "expense",
        necessity: "need",
      };
      const result = addTransaction(newTransaction);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(newTransaction);
      expect(result[1]).toEqual(existing);
    });

    it("should throw error when storage quota is exceeded", () => {
      const transaction: Transaction = {
        id: "1",
        date: "2024-01-15",
        reason: "coffee",
        amount: 100,
        paymentMode: "Cash",
        type: "expense",
        necessity: null,
      };

      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        // create a QuotaExceededError
        const error = new DOMException("Quota exceeded", "QuotaExceededError");
        throw error;
      });

      expect(() => addTransaction(transaction)).toThrow("Storage is full");
      setItemSpy.mockRestore();
    });
  });

  describe("deleteTransaction", () => {
    it("should delete a transaction by id", () => {
      const transactions: Transaction[] = [
        {
          id: "1",
          date: "2024-01-15",
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
        {
          id: "2",
          date: "2024-01-16",
          reason: "lunch",
          amount: 250,
          paymentMode: "Debit Card",
          type: "expense",
          necessity: "need",
        },
      ];
      localStorage.setItem("bujit_transactions", JSON.stringify(transactions));

      const result = deleteTransaction("1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
      expect(getTransactions()).toHaveLength(1);
    });

    it("should return same array when id doesn't exist", () => {
      const transactions: Transaction[] = [
        {
          id: "1",
          date: "2024-01-15",
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];
      localStorage.setItem("bujit_transactions", JSON.stringify(transactions));

      const result = deleteTransaction("999");
      expect(result).toHaveLength(1);
      expect(result).toEqual(transactions);
    });

    it("should handle empty transactions array", () => {
      const result = deleteTransaction("1");
      expect(result).toEqual([]);
    });
  });

  describe("updateTransaction", () => {
    it("should update a transaction", () => {
      const transactions: Transaction[] = [
        {
          id: "1",
          date: "2024-01-15",
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];
      localStorage.setItem("bujit_transactions", JSON.stringify(transactions));

      const result = updateTransaction("1", { amount: 150, reason: "latte" });
      expect(result[0].amount).toBe(150);
      expect(result[0].reason).toBe("latte");
      expect(result[0].id).toBe("1");
      expect(getTransactions()[0].amount).toBe(150);
    });

    it("should not update when id doesn't exist", () => {
      const transactions: Transaction[] = [
        {
          id: "1",
          date: "2024-01-15",
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];
      localStorage.setItem("bujit_transactions", JSON.stringify(transactions));

      const result = updateTransaction("999", { amount: 200 });
      expect(result).toEqual(transactions);
    });

    it("should update multiple fields at once", () => {
      const transactions: Transaction[] = [
        {
          id: "1",
          date: "2024-01-15",
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];
      localStorage.setItem("bujit_transactions", JSON.stringify(transactions));

      const result = updateTransaction("1", {
        amount: 200,
        reason: "lunch",
        necessity: "need",
      });
      expect(result[0].amount).toBe(200);
      expect(result[0].reason).toBe("lunch");
      expect(result[0].necessity).toBe("need");
    });
  });

  describe("getPaymentModes", () => {
    it("should return default modes when none exist", () => {
      const modes = getPaymentModes();
      expect(modes).toHaveLength(3);
      expect(modes[0].name).toBe("Debit Card");
      expect(modes[1].name).toBe("Cash");
      expect(modes[2].name).toBe("Credit Card");
    });

    it("should return saved payment modes", () => {
      const modes: PaymentMode[] = [
        { id: "1", name: "Custom Mode", shorthand: "CM" },
      ];
      localStorage.setItem("bujit_payment_modes", JSON.stringify(modes));
      expect(getPaymentModes()).toEqual(modes);
    });

    it("should return default modes on parse error", () => {
      localStorage.setItem("bujit_payment_modes", "invalid json");
      const modes = getPaymentModes();
      expect(modes).toHaveLength(3);
    });
  });

  describe("savePaymentModes", () => {
    it("should save payment modes to localStorage", () => {
      const modes: PaymentMode[] = [
        { id: "1", name: "Custom Mode", shorthand: "CM" },
      ];
      savePaymentModes(modes);
      expect(getPaymentModes()).toEqual(modes);
    });
  });

  describe("getTheme", () => {
    it("should return 'dark' as default", () => {
      expect(getTheme()).toBe("dark");
    });

    it("should return saved theme", () => {
      localStorage.setItem("bujit_theme", "light");
      expect(getTheme()).toBe("light");
    });

    it("should return 'dark' for invalid theme", () => {
      localStorage.setItem("bujit_theme", "invalid");
      expect(getTheme()).toBe("dark");
    });

    it("should return 'dark' on error", () => {
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("Storage error");
      });
      expect(getTheme()).toBe("dark");
      getItemSpy.mockRestore();
    });
  });

  describe("saveTheme", () => {
    it("should save theme to localStorage", () => {
      saveTheme("light");
      expect(localStorage.getItem("bujit_theme")).toBe("light");
      expect(getTheme()).toBe("light");
    });
  });

  describe("getSettings", () => {
    it("should return default settings when none exist", () => {
      const settings = getSettings();
      expect(settings.currency).toBe("PKR");
      expect(settings.currencySymbol).toBe("Rs.");
    });

    it("should return saved settings", () => {
      const customSettings: AppSettings = {
        currency: "USD",
        currencySymbol: "$",
      };
      localStorage.setItem("bujit_settings", JSON.stringify(customSettings));
      expect(getSettings()).toEqual(customSettings);
    });

    it("should merge with default settings", () => {
      const partialSettings = { currency: "EUR" };
      localStorage.setItem("bujit_settings", JSON.stringify(partialSettings));
      const result = getSettings();
      expect(result.currency).toBe("EUR");
      expect(result.currencySymbol).toBe("Rs."); // default preserved
    });

    it("should return default settings on parse error", () => {
      localStorage.setItem("bujit_settings", "invalid json");
      const settings = getSettings();
      expect(settings.currency).toBe("PKR");
      expect(settings.currencySymbol).toBe("Rs.");
    });
  });

  describe("saveSettings", () => {
    it("should save settings to localStorage", () => {
      const settings: AppSettings = {
        currency: "USD",
        currencySymbol: "$",
      };
      saveSettings(settings);
      expect(getSettings()).toEqual(settings);
    });
  });
});

