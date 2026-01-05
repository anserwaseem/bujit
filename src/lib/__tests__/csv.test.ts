import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  generateCSVTemplate,
  exportTransactionsToCSV,
  parseCSVToTransactions,
  downloadFile,
} from "../csv";
import type { Transaction, PaymentMode } from "../types";

describe("csv", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // mock crypto.randomUUID for consistent testing
    Object.defineProperty(global, "crypto", {
      value: {
        ...global.crypto,
        randomUUID: vi.fn(() => "test-uuid-123"),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("generateCSVTemplate", () => {
    it("should generate CSV template with correct headers", () => {
      const fixedDate = new Date("2024-06-15T12:00:00.000Z");
      vi.setSystemTime(fixedDate);

      const template = generateCSVTemplate();
      const lines = template.split("\n");

      expect(lines[0]).toBe("date,reason,amount,paymentMode,type,necessity");
    });

    it("should include example rows with current year", () => {
      const fixedDate = new Date("2024-06-15T12:00:00.000Z");
      vi.setSystemTime(fixedDate);

      const template = generateCSVTemplate();
      const lines = template.split("\n");

      expect(lines.length).toBeGreaterThan(1);
      expect(lines[1]).toContain("2024");
      expect(lines[2]).toContain("2024");
      expect(lines[3]).toContain("2024");
    });

    it("should include all required columns in examples", () => {
      const template = generateCSVTemplate();
      const lines = template.split("\n");

      // check that example rows have correct number of columns
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(",");
        expect(columns.length).toBe(6);
      }
    });

    it("should include examples for expense and income", () => {
      const template = generateCSVTemplate();
      const templateLower = template.toLowerCase();

      expect(templateLower).toContain("expense");
      expect(templateLower).toContain("income");
    });
  });

  describe("exportTransactionsToCSV", () => {
    it("should export empty transactions array", () => {
      const csv = exportTransactionsToCSV([]);
      const lines = csv.split("\n");

      expect(lines[0]).toBe("date,reason,amount,paymentMode,type,necessity");
      expect(lines.length).toBe(1);
    });

    it("should export transactions with correct format", () => {
      const transactions: Transaction[] = [
        {
          id: "1",
          date: "2024-06-15T12:00:00.000Z",
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: "need",
        },
      ];

      const csv = exportTransactionsToCSV(transactions);
      const lines = csv.split("\n");

      expect(lines[0]).toBe("date,reason,amount,paymentMode,type,necessity");
      expect(lines[1]).toContain("15/06/2024");
      expect(lines[1]).toContain('"coffee"');
      expect(lines[1]).toContain("100");
      expect(lines[1]).toContain("Cash");
      expect(lines[1]).toContain("expense");
      expect(lines[1]).toContain("need");
    });

    it("should format date as DD/MM/YYYY", () => {
      const transactions: Transaction[] = [
        {
          id: "1",
          date: "2024-01-05T12:00:00.000Z",
          reason: "test",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];

      const csv = exportTransactionsToCSV(transactions);
      const lines = csv.split("\n");

      expect(lines[1]).toContain("05/01/2024");
    });

    it("should escape quotes in reason field", () => {
      const transactions: Transaction[] = [
        {
          id: "1",
          date: "2024-06-15T12:00:00.000Z",
          reason: 'coffee with "special" quotes',
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];

      const csv = exportTransactionsToCSV(transactions);
      const lines = csv.split("\n");

      expect(lines[1]).toContain('""special""');
      expect(lines[1]).toContain('"coffee with ""special"" quotes"');
    });

    it("should handle empty necessity field", () => {
      const transactions: Transaction[] = [
        {
          id: "1",
          date: "2024-06-15T12:00:00.000Z",
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];

      const csv = exportTransactionsToCSV(transactions);
      const lines = csv.split("\n");

      // should end with empty field for necessity
      const columns = lines[1].split(",");
      expect(columns[5]).toBe("");
    });

    it("should export multiple transactions", () => {
      const transactions: Transaction[] = [
        {
          id: "1",
          date: "2024-06-15T12:00:00.000Z",
          reason: "coffee",
          amount: 100,
          paymentMode: "Cash",
          type: "expense",
          necessity: "need",
        },
        {
          id: "2",
          date: "2024-06-16T12:00:00.000Z",
          reason: "lunch",
          amount: 200,
          paymentMode: "Debit Card",
          type: "expense",
          necessity: "want",
        },
      ];

      const csv = exportTransactionsToCSV(transactions);
      const lines = csv.split("\n");

      expect(lines.length).toBe(3); // header + 2 transactions
      expect(lines[1]).toContain("coffee");
      expect(lines[2]).toContain("lunch");
    });

    it("should handle income transactions", () => {
      const transactions: Transaction[] = [
        {
          id: "1",
          date: "2024-06-15T12:00:00.000Z",
          reason: "salary",
          amount: 5000,
          paymentMode: "Cash",
          type: "income",
          necessity: null,
        },
      ];

      const csv = exportTransactionsToCSV(transactions);
      const lines = csv.split("\n");

      expect(lines[1]).toContain("income");
      expect(lines[1]).toContain("5000");
    });

    it("should handle decimal amounts", () => {
      const transactions: Transaction[] = [
        {
          id: "1",
          date: "2024-06-15T12:00:00.000Z",
          reason: "coffee",
          amount: 100.5,
          paymentMode: "Cash",
          type: "expense",
          necessity: null,
        },
      ];

      const csv = exportTransactionsToCSV(transactions);
      const lines = csv.split("\n");

      expect(lines[1]).toContain("100.5");
    });
  });

  describe("parseCSVToTransactions", () => {
    const existingModes: PaymentMode[] = [
      { id: "1", name: "Cash", shorthand: "C" },
      { id: "2", name: "Debit Card", shorthand: "D" },
    ];

    describe("valid CSV parsing", () => {
      it("should parse valid CSV with expense transaction", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100,Cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions).toHaveLength(1);
        expect(result.transactions[0].reason).toBe("coffee");
        expect(result.transactions[0].amount).toBe(100);
        expect(result.transactions[0].paymentMode).toBe("Cash");
        expect(result.transactions[0].type).toBe("expense");
        expect(result.transactions[0].necessity).toBe("need");
      });

      it("should parse valid CSV with income transaction", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,salary,5000,Cash,income,`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions).toHaveLength(1);
        expect(result.transactions[0].type).toBe("income");
        expect(result.transactions[0].necessity).toBeNull();
      });

      it("should parse multiple valid transactions", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100,Cash,expense,need
16/06/2024,lunch,200,Debit Card,expense,want
17/06/2024,salary,5000,Cash,income,`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions).toHaveLength(3);
      });

      it("should handle quoted values in reason", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,"coffee with ""quotes""",100,Cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions).toHaveLength(1);
        expect(result.transactions[0].reason).toBe('coffee with "quotes"');
      });

      it("should handle empty necessity for expense", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100,Cash,expense,`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions).toHaveLength(1);
        expect(result.transactions[0].necessity).toBeNull();
      });

      it("should match payment mode by name (case-insensitive)", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100,cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions[0].paymentMode).toBe("Cash");
      });

      it("should match payment mode by shorthand (case-insensitive)", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100,d,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions[0].paymentMode).toBe("Debit Card");
      });

      it("should create new payment mode if not found", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100,JazzCash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions).toHaveLength(1);
        expect(result.newPaymentModes).toHaveLength(1);
        expect(result.newPaymentModes[0].name).toBe("JazzCash");
        expect(result.newPaymentModes[0].shorthand).toBe("JAZZ");
        expect(result.transactions[0].paymentMode).toBe("JazzCash");
      });

      it("should handle single-digit day and month", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
5/6/2024,coffee,100,Cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions).toHaveLength(1);
      });

      it("should skip empty lines", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity

15/06/2024,coffee,100,Cash,expense,need

16/06/2024,lunch,200,Cash,expense,want`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions).toHaveLength(2);
      });

      it("should handle decimal amounts with up to 2 decimal places", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100.50,Cash,expense,need
16/06/2024,lunch,200.99,Cash,expense,want`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions).toHaveLength(2);
        expect(result.transactions[0].amount).toBe(100.5);
        expect(result.transactions[1].amount).toBe(200.99);
      });
    });

    describe("invalid CSV parsing - errors", () => {
      it("should return error for empty CSV", () => {
        const csv = "";

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("empty");
        expect(result.transactions).toHaveLength(0);
      });

      it("should return error for CSV with only header", () => {
        const csv = "date,reason,amount,paymentMode,type,necessity";

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("empty");
        expect(result.transactions).toHaveLength(0);
      });

      it("should return error for invalid date format", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
2024-06-15,coffee,100,Cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("Invalid date format");
        expect(result.transactions).toHaveLength(0);
      });

      it("should return error for invalid date values", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
32/06/2024,coffee,100,Cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("Invalid day");
        expect(result.transactions).toHaveLength(0);
      });

      it("should return error for invalid month", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/13/2024,coffee,100,Cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("Invalid month");
        expect(result.transactions).toHaveLength(0);
      });

      it("should return error for invalid date (e.g., 31/02/2024)", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
31/02/2024,coffee,100,Cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("Invalid date");
        expect(result.transactions).toHaveLength(0);
      });

      it("should return error for empty reason", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,,100,Cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("Reason cannot be empty");
        expect(result.transactions).toHaveLength(0);
      });

      it("should return error for invalid amount (not a number)", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,abc,Cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("Invalid amount");
        expect(result.transactions).toHaveLength(0);
      });

      it("should return error for zero amount", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,0,Cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("Amount must be greater than 0");
        expect(result.transactions).toHaveLength(0);
      });

      it("should return error for negative amount", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,-100,Cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("Amount must be greater than 0");
        expect(result.transactions).toHaveLength(0);
      });

      it("should return error for amount with more than 2 decimal places", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100.999,Cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("max 2 decimal places");
        expect(result.transactions).toHaveLength(0);
      });

      it("should return error for invalid type", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100,Cash,invalid,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("Invalid type");
        expect(result.errors[0]).toMatch(/expense|income/);
        expect(result.transactions).toHaveLength(0);
      });

      it("should return error for invalid necessity", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100,Cash,expense,invalid`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("Invalid necessity");
        expect(result.transactions).toHaveLength(0);
      });

      it("should return error for not enough columns", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("Not enough columns");
        expect(result.transactions).toHaveLength(0);
      });

      it("should collect multiple errors for multiple invalid rows", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,,100,Cash,expense,need
16/06/2024,lunch,abc,Cash,expense,want
17/06/2024,dinner,200,Cash,invalid,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors.length).toBe(3);
        expect(result.transactions).toHaveLength(0);
      });

      it("should include row numbers in error messages", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,abc,Cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors[0]).toContain("Row 2");
      });
    });

    describe("edge cases", () => {
      it("should handle whitespace in fields", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,  coffee  ,100,  Cash  ,expense,  need  `;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions[0].reason).toBe("coffee");
        expect(result.transactions[0].paymentMode).toBe("Cash");
        expect(result.transactions[0].necessity).toBe("need");
      });

      it("should handle missing payment mode (defaults to Cash)", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100,,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions[0].paymentMode).toBe("Cash");
      });

      it("should handle necessity case-insensitively", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100,Cash,expense,NEED
16/06/2024,lunch,200,Cash,expense,Want`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions[0].necessity).toBe("need");
        expect(result.transactions[1].necessity).toBe("want");
      });

      it("should handle type case-insensitively", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100,Cash,EXPENSE,need
16/06/2024,salary,5000,Cash,INCOME,`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions[0].type).toBe("expense");
        expect(result.transactions[1].type).toBe("income");
      });

      it("should handle very long reason with quotes", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,"This is a very long reason with ""quotes"" and commas, test",100,Cash,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions[0].reason).toContain("quotes");
        expect(result.transactions[0].reason).toContain("commas");
      });

      it("should handle large amounts", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,salary,1000000,Cash,income,`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions[0].amount).toBe(1000000);
      });

      it("should create payment mode with correct shorthand format", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100,VeryLongPaymentModeName,expense,need`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.newPaymentModes[0].shorthand).toBe("VERY");
        expect(result.newPaymentModes[0].shorthand.length).toBeLessThanOrEqual(
          4
        );
      });

      it("should reuse created payment mode in same import", () => {
        const csv = `date,reason,amount,paymentMode,type,necessity
15/06/2024,coffee,100,JazzCash,expense,need
16/06/2024,lunch,200,JazzCash,expense,want`;

        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.newPaymentModes).toHaveLength(1);
        expect(result.transactions[0].paymentMode).toBe("JazzCash");
        expect(result.transactions[1].paymentMode).toBe("JazzCash");
      });
    });

    describe("round-trip export/import", () => {
      it("should export and import transactions correctly", () => {
        const originalTransactions: Transaction[] = [
          {
            id: "1",
            date: "2024-06-15T12:00:00.000Z",
            reason: "coffee",
            amount: 100,
            paymentMode: "Cash",
            type: "expense",
            necessity: "need",
          },
          {
            id: "2",
            date: "2024-06-16T12:00:00.000Z",
            reason: "lunch",
            amount: 200.5,
            paymentMode: "Debit Card",
            type: "expense",
            necessity: "want",
          },
        ];

        const csv = exportTransactionsToCSV(originalTransactions);
        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions).toHaveLength(2);
        expect(result.transactions[0].reason).toBe("coffee");
        expect(result.transactions[0].amount).toBe(100);
        expect(result.transactions[1].reason).toBe("lunch");
        expect(result.transactions[1].amount).toBe(200.5);
      });

      it("should handle quoted reasons in round-trip", () => {
        const originalTransactions: Transaction[] = [
          {
            id: "1",
            date: "2024-06-15T12:00:00.000Z",
            reason: 'coffee with "quotes"',
            amount: 100,
            paymentMode: "Cash",
            type: "expense",
            necessity: "need",
          },
        ];

        const csv = exportTransactionsToCSV(originalTransactions);
        const result = parseCSVToTransactions(csv, existingModes);

        expect(result.errors).toHaveLength(0);
        expect(result.transactions[0].reason).toBe('coffee with "quotes"');
      });
    });
  });

  describe("downloadFile", () => {
    it("should create blob with correct content and type", () => {
      // mock URL methods
      const mockUrl = "blob:mock-url";
      global.URL.createObjectURL = vi.fn(() => mockUrl);
      global.URL.revokeObjectURL = vi.fn();

      const content = "test,content\n1,2";
      const filename = "test.csv";
      const mimeType = "text/csv";

      // mock DOM methods to avoid actual DOM manipulation
      const mockLink = document.createElement("a");
      mockLink.href = "";
      mockLink.download = "";
      mockLink.click = vi.fn();
      vi.spyOn(document, "createElement").mockReturnValue(mockLink);
      vi.spyOn(document.body, "appendChild").mockReturnValue(mockLink);
      vi.spyOn(document.body, "removeChild").mockReturnValue(mockLink);

      downloadFile(content, filename, mimeType);

      // verify blob was created with correct type
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      const blob = (global.URL.createObjectURL as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe(mimeType);

      // verify cleanup
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);

      vi.restoreAllMocks();
    });
  });
});
