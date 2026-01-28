import { ChevronUp } from "lucide-react";
import { cn, haptic } from "@/lib/utils";
import type { UseScrollIndicatorsReturn } from "@/hooks/useScrollIndicators";

interface ScrollIndicatorsProps {
  indicators: UseScrollIndicatorsReturn;
  isInContainer?: boolean;
}

export function ScrollIndicators({
  indicators,
  isInContainer = false,
}: ScrollIndicatorsProps) {
  const { showScrollTop, showScrollBottom, scrollToTop } = indicators;

  const handleScrollToTop = () => {
    haptic("light");
    scrollToTop();
  };

  return (
    <>
      {/* Top scroll indicator gradient - only for window scrolling */}
      {!isInContainer && showScrollTop && (
        <div className="fixed top-0 left-0 right-0 h-12 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-30 transition-opacity duration-300" />
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={handleScrollToTop}
          className={cn(
            isInContainer ? "absolute" : "fixed",
            isInContainer ? "z-10" : "z-40",
            "bottom-4 right-4 sm:right-6 w-12 h-12 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-lg hover:bg-card active:bg-card/80 transition-all flex items-center justify-center animate-fade-in touch-manipulation select-none"
          )}
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5 text-foreground" />
        </button>
      )}

      {/* Bottom scroll indicator gradient - only for window scrolling */}
      {!isInContainer && showScrollBottom && (
        <div className="fixed bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-30 transition-opacity duration-300" />
      )}
    </>
  );
}
