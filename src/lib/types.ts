export type TransactionType = 'expense' | 'income' | 'savings';
export type NecessityType = 'need' | 'want' | null;

export interface Transaction {
  id: string;
  date: string;
  reason: string;
  amount: number;
  paymentMode: string;
  type: TransactionType;
  necessity: NecessityType;
}

export interface PaymentMode {
  id: string;
  name: string;
  shorthand: string;
}

export interface ParsedInput {
  reason: string;
  paymentMode: string;
  amount: number | null;
  isValid: boolean;
}

export interface AppSettings {
  currency: string;
  currencySymbol: string;
  geminiApiKey: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
