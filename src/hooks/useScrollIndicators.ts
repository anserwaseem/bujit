import { useState, useEffect, useCallback, type RefObject } from "react";

interface UseScrollIndicatorsOptions {
  scrollContainerRef?: RefObject<HTMLElement>;
  topThreshold?: number;
  bottomThreshold?: number;
}

export interface UseScrollIndicatorsReturn {
  showScrollTop: boolean;
  showScrollBottom: boolean;
  scrollToTop: () => void;
}

/**
 * Hook to track scroll position and provide scroll indicator state.
 * Works with both window scrolling and container scrolling.
 */
export function useScrollIndicators(
  options: UseScrollIndicatorsOptions = {}
): UseScrollIndicatorsReturn {
  const {
    scrollContainerRef,
    topThreshold = 200,
    bottomThreshold = 100,
  } = options;

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    const scrollElement = container ?? window;

    const handleScroll = () => {
      if (container) {
        // Container scrolling
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const scrollBottom = scrollHeight - scrollTop - clientHeight;

        setShowScrollTop(scrollTop > topThreshold);
        setShowScrollBottom(scrollBottom > bottomThreshold);
      } else {
        // Window scrolling
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollBottom = documentHeight - scrollY - windowHeight;

        setShowScrollTop(scrollY > topThreshold);
        setShowScrollBottom(scrollBottom > bottomThreshold);
      }
    };

    // Check initial state
    handleScroll();

    scrollElement.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [scrollContainerRef, topThreshold, bottomThreshold]);

  const scrollToTop = useCallback(() => {
    const container = scrollContainerRef?.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [scrollContainerRef]);

  return {
    showScrollTop,
    showScrollBottom,
    scrollToTop,
  };
}
