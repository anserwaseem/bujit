import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { Transaction, ChatMessage } from '@/lib/types';
import { formatAmount } from '@/lib/parser';
import { cn } from '@/lib/utils';

interface AIChatDialogProps {
  apiKey: string;
  transactions: Transaction[];
  currencySymbol: string;
  onClose: () => void;
}

export function AIChatDialog({ apiKey, transactions, currencySymbol, onClose }: AIChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Assalam o alaikum! Main aapka budget assistant hoon. Mujhse kuch bhi poocho - "Meri wants kaisi hain?", "Is mahine kitna kharch hua?", ya koi bhi sawal! 💰',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getFinancialContext = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const thisMonth = transactions.filter(
      (t) => new Date(t.date) >= startOfMonth && t.type === 'expense'
    );
    
    const totalExpenses = thisMonth.reduce((sum, t) => sum + t.amount, 0);
    const needsTotal = thisMonth.filter((t) => t.necessity === 'need').reduce((sum, t) => sum + t.amount, 0);
    const wantsTotal = thisMonth.filter((t) => t.necessity === 'want').reduce((sum, t) => sum + t.amount, 0);
    
    const topExpenses = [...thisMonth]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((t) => `${t.reason}: ${currencySymbol}${formatAmount(t.amount)} (${t.necessity || 'uncategorized'})`)
      .join(', ');

    return `
User's Financial Data (Current Month):
- Total Expenses: ${currencySymbol}${formatAmount(totalExpenses)}
- Needs Total: ${currencySymbol}${formatAmount(needsTotal)}
- Wants Total: ${currencySymbol}${formatAmount(wantsTotal)}
- Number of Transactions: ${thisMonth.length}
- Top 5 Expenses: ${topExpenses || 'No transactions yet'}
- Currency: ${currencySymbol}

Remember to:
1. Respond in Roman Urdu (Urdu written in English letters) with some English financial terms
2. Be friendly and encouraging
3. Give practical advice based on the data
4. Use emojis sparingly
5. Keep responses concise but helpful
`;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a friendly Pakistani budget advisor who speaks in Roman Urdu (Urdu written in English letters). You help users understand their spending habits and give practical advice.

${getFinancialContext()}

User's Question: ${input.trim()}

Respond naturally in Roman Urdu, mixing in English financial terms when needed. Be encouraging and helpful!`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500,
            },
          }),
        }
      );

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
        'Sorry, kuch masla ho gaya. Dobara try karein!';

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Maaf kijiye, network mein masla hai. Apna internet check karein aur dobara try karein!',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!apiKey) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl animate-scale-in p-6 text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">AI Assistant Setup</h2>
          <p className="text-sm text-muted-foreground mb-4">
            AI assistant use karne ke liye, pehle Settings mein apni Gemini API key add karein.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Budget Buddy</h2>
            <p className="text-xs text-muted-foreground">Aapka personal finance advisor</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[85%] p-3 rounded-2xl animate-slide-up",
              msg.role === 'user'
                ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card border border-border rounded-bl-sm"
            )}
          >
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Soch raha hoon...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Apna sawal likhein..."
            className="flex-1 bg-card border border-border rounded-lg px-4 py-3 
                       focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className={cn(
              "p-3 rounded-lg transition-all",
              input.trim() && !isLoading
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
