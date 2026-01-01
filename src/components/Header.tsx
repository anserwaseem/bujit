import { Sun, Moon, Settings } from 'lucide-react';
import { Logo } from './Logo';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export function Header({ theme, onToggleTheme, onOpenSettings }: HeaderProps) {
  return (
    <header className="flex items-center justify-between py-4">
      <div className="flex items-center gap-2">
        <Logo size={36} className="rounded-lg" />
        <span className="text-xl font-semibold text-foreground">bujit</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-card hover:bg-muted transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg bg-card hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-foreground" />
          )}
        </button>
      </div>
    </header>
  );
}