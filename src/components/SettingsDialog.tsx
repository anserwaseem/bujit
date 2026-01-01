import { useState, useRef } from 'react';
import { X, Plus, Trash2, Eye, EyeOff, RefreshCw, Download, Upload, FileText, Pencil, Check } from 'lucide-react';
import { AppSettings, PaymentMode, Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { safeUpdate } from '@/lib/pwa';
import { useToast } from '@/hooks/use-toast';
import { generateCSVTemplate, exportTransactionsToCSV, parseCSVToTransactions, downloadFile } from '@/lib/csv';

interface SettingsDialogProps {
  settings: AppSettings;
  paymentModes: PaymentMode[];
  transactions: Transaction[];
  onSaveSettings: (settings: AppSettings) => void;
  onSavePaymentModes: (modes: PaymentMode[]) => void;
  onImportTransactions: (transactions: Omit<Transaction, 'id'>[], newModes?: PaymentMode[]) => void;
  onClose: () => void;
}

const CURRENCIES = [
  { code: 'PKR', symbol: 'Rs.', name: 'Pakistani Rupee' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
];

export function SettingsDialog({
  settings,
  paymentModes,
  transactions,
  onSaveSettings,
  onSavePaymentModes,
  onImportTransactions,
  onClose,
}: SettingsDialogProps) {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState(settings);
  const [localModes, setLocalModes] = useState(paymentModes);
  const [newModeName, setNewModeName] = useState('');
  const [newModeShort, setNewModeShort] = useState('');
  const [editingModeId, setEditingModeId] = useState<string | null>(null);
  const [editModeName, setEditModeName] = useState('');
  const [editModeShort, setEditModeShort] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'payments' | 'data' | 'ai'>('general');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddMode = () => {
    if (!newModeName.trim() || !newModeShort.trim()) return;
    const newMode: PaymentMode = {
      id: crypto.randomUUID(),
      name: newModeName.trim(),
      shorthand: newModeShort.trim().toUpperCase(),
    };
    setLocalModes([...localModes, newMode]);
    setNewModeName('');
    setNewModeShort('');
  };

  const handleDeleteMode = (id: string) => {
    setLocalModes(localModes.filter((m) => m.id !== id));
  };

  const handleEditMode = (mode: PaymentMode) => {
    setEditingModeId(mode.id);
    setEditModeName(mode.name);
    setEditModeShort(mode.shorthand);
  };

  const handleSaveEditMode = () => {
    if (!editModeName.trim() || !editModeShort.trim() || !editingModeId) return;
    setLocalModes(localModes.map(m => 
      m.id === editingModeId 
        ? { ...m, name: editModeName.trim(), shorthand: editModeShort.trim().toUpperCase() }
        : m
    ));
    setEditingModeId(null);
    setEditModeName('');
    setEditModeShort('');
  };

  const handleCancelEdit = () => {
    setEditingModeId(null);
    setEditModeName('');
    setEditModeShort('');
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onSavePaymentModes(localModes);
    onClose();
  };

  const handleCurrencyChange = (code: string) => {
    const currency = CURRENCIES.find((c) => c.code === code);
    if (currency) {
      setLocalSettings({
        ...localSettings,
        currency: currency.code,
        currencySymbol: currency.symbol,
      });
    }
  };


  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    toast({
      title: "Updating...",
      description: "Checking for updates. Your data is preserved.",
    });
    await safeUpdate();
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    downloadFile(template, 'budgly-template.csv');
    toast({
      title: "Template Downloaded",
      description: "Fill in your data following the example format.",
    });
  };

  const handleExportData = () => {
    if (transactions.length === 0) {
      toast({
        title: "No Data",
        description: "There are no transactions to export.",
        variant: "destructive",
      });
      return;
    }
    const csv = exportTransactionsToCSV(transactions);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(csv, `budgly-export-${date}.csv`);
    toast({
      title: "Data Exported",
      description: `${transactions.length} transactions exported successfully.`,
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const { transactions: parsed, errors, newPaymentModes } = parseCSVToTransactions(content, localModes);

      // If there are ANY errors, reject the entire import
      if (errors.length > 0) {
        toast({
          title: "Import Failed",
          description: errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : ''),
          variant: "destructive",
        });
        return; // Don't import anything
      }

      if (parsed.length > 0) {
        // Add new payment modes to local state
        if (newPaymentModes.length > 0) {
          setLocalModes([...localModes, ...newPaymentModes]);
        }
        
        onImportTransactions(parsed, newPaymentModes);
        toast({
          title: "Import Successful",
          description: `${parsed.length} transactions imported.` + 
            (newPaymentModes.length > 0 ? ` ${newPaymentModes.length} new payment mode(s) added.` : ''),
        });
      } else {
        toast({
          title: "No Data",
          description: "The file contains no valid transactions.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl animate-scale-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-border shrink-0">
          {(['general', 'payments', 'data', 'ai'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab === 'ai' ? 'AI' : tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Currency</label>
                <select
                  value={localSettings.currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 pr-8 appearance-none
                             focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                             bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] 
                             bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} - {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  This currency will be used throughout the app for displaying amounts.
                </p>
              </div>

              {/* App Update Section */}
              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-medium mb-3">App Updates</h3>
                <button
                  onClick={handleForceRefresh}
                  disabled={isRefreshing}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors",
                    "bg-primary text-primary-foreground hover:opacity-90"
                  )}
                >
                  <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                  {isRefreshing ? "Updating..." : "Update App"}
                </button>
                <p className="text-xs text-muted-foreground mt-2">
                  Checks for updates and reloads. Your data is preserved.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add your payment methods. Use the shorthand when entering transactions (e.g., "chai JC 50" for JazzCash).
              </p>

              {/* Add new mode */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newModeName}
                  onChange={(e) => setNewModeName(e.target.value)}
                  placeholder="Name (e.g., JazzCash)"
                  className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <input
                  type="text"
                  value={newModeShort}
                  onChange={(e) => setNewModeShort(e.target.value)}
                  placeholder="Code (JC)"
                  className="w-24 bg-input border border-border rounded-lg px-3 py-2 text-sm uppercase
                             focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  maxLength={4}
                />
                <button
                  onClick={handleAddMode}
                  disabled={!newModeName.trim() || !newModeShort.trim()}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    newModeName.trim() && newModeShort.trim()
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Modes list */}
              <div className="space-y-2">
                {localModes.map((mode) => (
                  <div
                    key={mode.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    {editingModeId === mode.id ? (
                      <>
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editModeName}
                            onChange={(e) => setEditModeName(e.target.value)}
                            placeholder="Name"
                            className="flex-1 bg-input border border-border rounded-lg px-2 py-1 text-sm
                                       focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          />
                          <input
                            type="text"
                            value={editModeShort}
                            onChange={(e) => setEditModeShort(e.target.value)}
                            placeholder="Code"
                            className="w-16 bg-input border border-border rounded-lg px-2 py-1 text-sm uppercase
                                       focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            maxLength={4}
                          />
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={handleSaveEditMode}
                            disabled={!editModeName.trim() || !editModeShort.trim()}
                            className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground 
                                       hover:bg-muted transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                            {mode.shorthand}
                          </span>
                          <span className="font-medium">{mode.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditMode(mode)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground 
                                       hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMode(mode.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive 
                                       hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <p className="text-sm text-muted-foreground">
                Import or export your transaction data using CSV format.
              </p>

              {/* Export Section */}
              <div>
                <h3 className="text-sm font-medium mb-3">Export Data</h3>
                <button
                  onClick={handleExportData}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium
                             bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Download className="w-4 h-4" />
                  Export All Transactions
                </button>
                <p className="text-xs text-muted-foreground mt-2">
                  Download all {transactions.length} transactions as a CSV file.
                </p>
              </div>

              {/* Import Section */}
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium mb-3">Import Data</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium
                               bg-muted text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Download CSV Template
                  </button>
                  
                  <button
                    onClick={handleImportClick}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium
                               bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Upload className="w-4 h-4" />
                    Import CSV File
                  </button>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 mt-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Format:</strong> DD/MM/YYYY, reason, amount, paymentMode, type, necessity
                    <br />
                    <span className="text-muted-foreground/80">
                      Unknown payment modes are auto-added. Necessity is ignored for income.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enable AI-powered insights for your spending. Get personalized analysis and advice in any language.
              </p>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={localSettings.geminiApiKey}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, geminiApiKey: e.target.value })
                    }
                    placeholder="Enter your Gemini API key"
                    className="w-full bg-input border border-border rounded-lg px-3 py-2.5 pr-10
                               focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground 
                               hover:text-foreground transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  Get your free API key from{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google AI Studio
                  </a>
                  . Your key is stored locally and never shared.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-medium bg-muted text-muted-foreground 
                       hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground 
                       hover:opacity-90 transition-opacity"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
