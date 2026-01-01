import { RefreshCw } from 'lucide-react';

interface UpdatePromptProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdatePrompt({ onUpdate, onDismiss }: UpdatePromptProps) {
  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50 animate-slide-up">
      <div className="bg-card border border-border rounded-xl p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">New Update Available!</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              A new version of Budgeter is ready. Update now for the latest features.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onDismiss}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground 
                       hover:bg-muted/80 transition-colors"
          >
            Later
          </button>
          <button
            onClick={onUpdate}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground 
                       hover:opacity-90 transition-opacity"
          >
            Update Now
          </button>
        </div>
      </div>
    </div>
  );
}
