import { useState, useRef, ReactNode } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/utils';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: { icon: ReactNode; color: string; label: string };
  rightAction?: { icon: ReactNode; color: string; label: string };
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction = { icon: <Trash2 className="w-5 h-5" />, color: 'bg-destructive', label: 'Delete' },
  rightAction = { icon: <Pencil className="w-5 h-5" />, color: 'bg-primary', label: 'Edit' },
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const THRESHOLD = 80;
  const MAX_SWIPE = 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Limit swipe distance
    const limitedDiff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff));
    setTranslateX(limitedDiff);
    
    // Haptic feedback when crossing threshold
    if (Math.abs(limitedDiff) >= THRESHOLD && Math.abs(translateX) < THRESHOLD) {
      haptic('medium');
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (translateX <= -THRESHOLD && onSwipeLeft) {
      haptic('success');
      onSwipeLeft();
    } else if (translateX >= THRESHOLD && onSwipeRight) {
      haptic('success');
      onSwipeRight();
    }
    
    setTranslateX(0);
  };

  const leftOpacity = Math.min(1, Math.abs(Math.min(0, translateX)) / THRESHOLD);
  const rightOpacity = Math.min(1, Math.max(0, translateX) / THRESHOLD);

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Left Action (Delete) - shown on swipe left */}
      <div 
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-end px-4",
          leftAction.color,
          "text-destructive-foreground"
        )}
        style={{ opacity: leftOpacity }}
      >
        <div className="flex flex-col items-center gap-0.5">
          {leftAction.icon}
          <span className="text-xs font-medium">{leftAction.label}</span>
        </div>
      </div>
      
      {/* Right Action (Edit) - shown on swipe right */}
      <div 
        className={cn(
          "absolute inset-y-0 left-0 flex items-center justify-start px-4",
          rightAction.color,
          "text-primary-foreground"
        )}
        style={{ opacity: rightOpacity }}
      >
        <div className="flex flex-col items-center gap-0.5">
          {rightAction.icon}
          <span className="text-xs font-medium">{rightAction.label}</span>
        </div>
      </div>

      {/* Main Card Content */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "relative bg-background",
          !isDragging && "transition-transform duration-200"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
