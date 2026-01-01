import { useState } from 'react';
import { X, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { AppSettings, PaymentMode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  settings: AppSettings;
  paymentModes: PaymentMode[];
  onSaveSettings: (settings: AppSettings) => void;
  onSavePaymentModes: (modes: PaymentMode[]) => void;
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
  onSaveSettings,
  onSavePaymentModes,
  onClose,
}: SettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [localModes, setLocalModes] = useState(paymentModes);
  const [newModeName, setNewModeName] = useState('');
  const [newModeShort, setNewModeShort] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'payments' | 'ai'>('general');

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
          {(['general', 'payments', 'ai'] as const).map((tab) => (
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
              {tab === 'ai' ? 'AI Assistant' : tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Currency</label>
                <select
                  value={localSettings.currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 
                             focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} - {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                This currency will be used throughout the app for displaying amounts.
              </p>
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
                  placeholder="Short (JC)"
                  className="w-20 bg-input border border-border rounded-lg px-3 py-2 text-sm uppercase
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
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        {mode.shorthand}
                      </span>
                      <span className="font-medium">{mode.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteMode(mode.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive 
                                 hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect Google Gemini AI to get personalized budget advice in Roman Urdu. Ask things like "Meri wants kaisi hain?" or "Is mahine mein kitna bacha?"
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
