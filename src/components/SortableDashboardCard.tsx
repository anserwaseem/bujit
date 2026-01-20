import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableDashboardCardProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function SortableDashboardCard({
  id,
  children,
  className,
}: SortableDashboardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative group", className)}
    >
      {/* Drag Handle - appears on hover/touch, iOS-friendly */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-2 right-2 z-10",
          // iOS-first: visible by default on small screens (no hover),
          // subtle on desktop until hover.
          "opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
          "cursor-grab active:cursor-grabbing",
          "p-1.5 rounded hover:bg-muted active:bg-muted/80",
          "touch-none", // Prevent touch scrolling issues on iOS
          "select-none", // Prevent text selection on iOS
          "active:opacity-100"
        )}
        aria-label="Drag to reorder"
        role="button"
        tabIndex={0}
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}
