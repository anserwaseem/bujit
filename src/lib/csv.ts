import { Transaction, PaymentMode } from './types';

const CSV_HEADERS = ['date', 'reason', 'amount', 'paymentMode', 'type', 'necessity'];

export interface CSVParseResult {
  transactions: Omit<Transaction, 'id'>[];
  errors: string[];
  newPaymentModes: PaymentMode[];
}

export function generateCSVTemplate(): string {
  const headers = CSV_HEADERS.join(',');
  // Use current year for example dates
  const currentYear = new Date().getFullYear();
  const exampleRows = [
    `10/01/${currentYear},Groceries,2500,Cash,expense,need`,
    `11/01/${currentYear},Coffee,350,JC,expense,want`,
    `09/01/${currentYear},Salary,50000,Bank,income,`,
  ];
  return [headers, ...exampleRows].join('\n');
}

export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const headers = CSV_HEADERS.join(',');
  const rows = transactions.map((t) => {
    // Format date as DD/MM/YYYY
    const date = new Date(t.date);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    
    return [
      formattedDate,
      `"${t.reason.replace(/"/g, '""')}"`, // Escape quotes in reason
      t.amount,
      t.paymentMode,
      t.type,
      t.necessity || '',
    ].join(',');
  });
  return [headers, ...rows].join('\n');
}

export function parseCSVToTransactions(
  csvContent: string, 
  existingModes: PaymentMode[]
): CSVParseResult {
  const lines = csvContent.trim().split('\n');
  const errors: string[] = [];
  const transactions: Omit<Transaction, 'id'>[] = [];
  const newPaymentModes: PaymentMode[] = [];
  
  // Create a map of existing modes (by name and shorthand, case-insensitive)
  const modeMap = new Map<string, PaymentMode>();
  existingModes.forEach(mode => {
    modeMap.set(mode.name.toUpperCase(), mode);
    modeMap.set(mode.shorthand.toUpperCase(), mode);
  });

  if (lines.length < 2) {
    errors.push('CSV file is empty or has no data rows');
    return { transactions, errors, newPaymentModes };
  }

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCSVLine(line);
      
      if (values.length < 5) {
        errors.push(`Row ${i + 1}: Not enough columns (need at least 5)`);
        continue;
      }

      const [date, reason, amountStr, paymentModeStr, type, necessity] = values;

      // Validate date - ONLY DD/MM/YYYY format
      const ddmmyyyyMatch = date.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!ddmmyyyyMatch) {
        errors.push(`Row ${i + 1}: Invalid date format "${date}". Use DD/MM/YYYY (e.g., 15/01/2026)`);
        continue;
      }
      
      const [, dayStr, monthStr, yearStr] = ddmmyyyyMatch;
      const day = parseInt(dayStr);
      const month = parseInt(monthStr);
      const year = parseInt(yearStr);
      
      // Validate date values
      if (month < 1 || month > 12) {
        errors.push(`Row ${i + 1}: Invalid month "${month}". Must be between 1-12`);
        continue;
      }
      if (day < 1 || day > 31) {
        errors.push(`Row ${i + 1}: Invalid day "${day}". Must be between 1-31`);
        continue;
      }
      
      const dateObj = new Date(year, month - 1, day);
      if (isNaN(dateObj.getTime()) || dateObj.getDate() !== day) {
        errors.push(`Row ${i + 1}: Invalid date "${date}"`);
        continue;
      }

      // Validate reason - must be non-empty
      const trimmedReason = reason.trim();
      if (trimmedReason.length === 0) {
        errors.push(`Row ${i + 1}: Reason cannot be empty`);
        continue;
      }

      // Validate amount - must be positive number (up to 2 decimal places)
      const amount = parseFloat(amountStr.trim());
      if (isNaN(amount)) {
        errors.push(`Row ${i + 1}: Invalid amount "${amountStr}". Must be a number`);
        continue;
      }
      if (amount <= 0) {
        errors.push(`Row ${i + 1}: Amount must be greater than 0 (got "${amountStr}")`);
        continue;
      }
      // Check for more than 2 decimal places
      const decimalParts = amountStr.trim().split('.');
      if (decimalParts.length > 1 && decimalParts[1].length > 2) {
        errors.push(`Row ${i + 1}: Amount can have max 2 decimal places (got "${amountStr}")`);
        continue;
      }

      // Validate type - must be expense, income, or savings
      const trimmedType = type.trim().toLowerCase();
      if (!['expense', 'income', 'savings'].includes(trimmedType)) {
        errors.push(`Row ${i + 1}: Invalid type "${type}". Must be 'expense', 'income', or 'savings'`);
        continue;
      }

      // Handle payment mode - auto-create if unknown
      const trimmedPaymentMode = paymentModeStr.trim();
      let finalPaymentMode = trimmedPaymentMode || 'Cash';
      
      if (trimmedPaymentMode) {
        const existingMode = modeMap.get(trimmedPaymentMode.toUpperCase());
        if (existingMode) {
          finalPaymentMode = existingMode.name;
        } else {
          // Create new payment mode
          const newMode: PaymentMode = {
            id: crypto.randomUUID(),
            name: trimmedPaymentMode,
            shorthand: trimmedPaymentMode.toUpperCase().slice(0, 4),
          };
          newPaymentModes.push(newMode);
          modeMap.set(trimmedPaymentMode.toUpperCase(), newMode);
          finalPaymentMode = trimmedPaymentMode;
        }
      }

      // Validate necessity - only for expenses, ignore for income/savings
      let validNecessity: 'need' | 'want' | null = null;
      if (trimmedType === 'expense') {
        const trimmedNecessity = (necessity || '').trim().toLowerCase();
        if (trimmedNecessity && !['need', 'want'].includes(trimmedNecessity)) {
          errors.push(`Row ${i + 1}: Invalid necessity "${necessity}". Must be 'need', 'want', or empty`);
          continue;
        }
        validNecessity = trimmedNecessity ? (trimmedNecessity as 'need' | 'want') : null;
      }
      // For income/savings, necessity is ignored (stays null)

      transactions.push({
        date: dateObj.toISOString(),
        reason: trimmedReason,
        amount,
        paymentMode: finalPaymentMode,
        type: trimmedType as 'expense' | 'income' | 'savings',
        necessity: validNecessity,
      });
    } catch (err) {
      errors.push(`Row ${i + 1}: Failed to parse`);
    }
  }

  return { transactions, errors, newPaymentModes };
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current);
  return values;
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
