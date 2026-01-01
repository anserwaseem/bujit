import { Transaction } from './types';

const CSV_HEADERS = ['date', 'reason', 'amount', 'paymentMode', 'type', 'necessity'];

export function generateCSVTemplate(): string {
  const headers = CSV_HEADERS.join(',');
  const exampleRows = [
    '2025-01-15,Groceries,2500,Cash,expense,need',
    '2025-01-15,Coffee,350,JC,expense,want',
    '2025-01-14,Salary,50000,Bank,income,',
  ];
  return [headers, ...exampleRows].join('\n');
}

export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const headers = CSV_HEADERS.join(',');
  const rows = transactions.map((t) => {
    return [
      t.date,
      `"${t.reason.replace(/"/g, '""')}"`, // Escape quotes in reason
      t.amount,
      t.paymentMode,
      t.type,
      t.necessity || '',
    ].join(',');
  });
  return [headers, ...rows].join('\n');
}

export function parseCSVToTransactions(csvContent: string): { transactions: Omit<Transaction, 'id'>[]; errors: string[] } {
  const lines = csvContent.trim().split('\n');
  const errors: string[] = [];
  const transactions: Omit<Transaction, 'id'>[] = [];

  if (lines.length < 2) {
    errors.push('CSV file is empty or has no data rows');
    return { transactions, errors };
  }

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCSVLine(line);
      
      if (values.length < 5) {
        errors.push(`Row ${i + 1}: Not enough columns`);
        continue;
      }

      const [date, reason, amountStr, paymentMode, type, necessity] = values;

      // Validate and parse date (supports YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)
      let dateObj: Date;
      const ddmmyyyyMatch = date.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        dateObj = new Date(date);
      }
      if (isNaN(dateObj.getTime())) {
        errors.push(`Row ${i + 1}: Invalid date "${date}"`);
        continue;
      }

      // Validate amount
      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
        errors.push(`Row ${i + 1}: Invalid amount "${amountStr}"`);
        continue;
      }

      // Validate type
      if (!['expense', 'income', 'savings'].includes(type)) {
        errors.push(`Row ${i + 1}: Invalid type "${type}" (must be expense, income, or savings)`);
        continue;
      }

      // Validate necessity (optional)
      let validNecessity: 'need' | 'want' | null = null;
      if (necessity) {
        if (!['need', 'want'].includes(necessity)) {
          errors.push(`Row ${i + 1}: Invalid necessity "${necessity}" (must be need, want, or empty)`);
          continue;
        }
        validNecessity = necessity as 'need' | 'want';
      }

      transactions.push({
        date: dateObj.toISOString(),
        reason: reason.trim(),
        amount,
        paymentMode: paymentMode.trim() || 'Cash',
        type: type as 'expense' | 'income' | 'savings',
        necessity: validNecessity,
      });
    } catch (err) {
      errors.push(`Row ${i + 1}: Failed to parse`);
    }
  }

  return { transactions, errors };
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
