import { useCallback, useMemo } from "react";
import type { AppSettings, PaymentMode, StreakData, Transaction } from "@/lib/types";
import type { TimePeriod } from "@/hooks/useFilters";
import { saveDashboardLayout } from "@/lib/storage";
import { getPeriodText } from "@/lib/utils";
import { maskReason } from "@/lib/privacy";
import { useDashboardAnalytics } from "./hooks/useDashboardAnalytics";
import { useDashboardLayout } from "./hooks/useDashboardLayout";
import { useFormatAmount } from "./hooks/useFormatAmount";
import { DashboardSortableGrid } from "./dnd/DashboardSortableGrid";
import type { DashboardCardId, DashboardCardSpec } from "./types";
import { buildDashboardCards } from "./registry/buildDashboardCards";
import type { AdditionalFilterCriteria } from "@/components/FilteredTransactionsDialog";
import { useScrollIndicators } from "@/hooks/useScrollIndicators";
import { ScrollIndicators } from "@/components/ScrollIndicators";

interface DashboardProps {
  transactions: Transaction[]; // Filtered transactions
  allTransactions: Transaction[]; // All transactions (unfiltered)
  currencySymbol: string;
  settings: AppSettings;
  streakData?: StreakData;
  timePeriod: TimePeriod;
  paymentModes: PaymentMode[];
  onOpenFilteredTransactions: (
    additionalFilter: AdditionalFilterCriteria,
    title: string
  ) => void;
}

export function Dashboard({
  transactions,
  allTransactions,
  currencySymbol,
  settings,
  streakData,
  timePeriod,
  paymentModes,
  onOpenFilteredTransactions,
}: DashboardProps) {
  /** Parent already filtered; keep API stable. */
  const filteredTransactions = transactions;

  const periodText = getPeriodText(timePeriod);
  const analytics = useDashboardAnalytics(filteredTransactions, allTransactions);
  const formatAmountWithPrivacy = useFormatAmount(settings, currencySymbol);

  const { layout, setLayout, orderedIds } = useDashboardLayout();

  const cards: Record<DashboardCardId, DashboardCardSpec> = useMemo(() => {
    return buildDashboardCards({
      analytics,
      currencySymbol,
      settings,
      streakData,
      periodText,
      formatAmountWithPrivacy,
      maskReason: (reason) => maskReason(reason, settings),
      onOpenFilteredTransactions,
      paymentModes,
    });
  }, [
    analytics,
    currencySymbol,
    settings,
    streakData,
    periodText,
    formatAmountWithPrivacy,
    onOpenFilteredTransactions,
    paymentModes,
  ]);

  const renderCard = (id: DashboardCardId) => cards[id]?.render() ?? null;
  const isFullWidth = (id: DashboardCardId) =>
    Boolean(cards[id]?.fullWidth || cards[id]?.type === "chart");

  const onReorder = useCallback(
    (newOrder: DashboardCardId[]) => {
      // Keep the same card metadata but update ordering.
      const updated = layout.map((c) => {
        const newIndex = newOrder.indexOf(c.id as DashboardCardId);
        return newIndex === -1 ? c : { ...c, order: newIndex };
      });
      setLayout(updated);
      saveDashboardLayout(updated);
    },
    [layout, setLayout]
  );

  // Only show cards that exist in registry (defensive against old layouts)
  const visibleIds = orderedIds.filter((id) => Boolean(cards[id]));

  // Scroll indicators for dashboard
  const scrollIndicators = useScrollIndicators();

  return (
    <>
      <ScrollIndicators indicators={scrollIndicators} />
      <div className="space-y-4 animate-fade-in">
        <DashboardSortableGrid
          ids={visibleIds}
          isFullWidth={isFullWidth}
          renderCard={renderCard}
          onReorder={onReorder}
        />
      </div>
    </>
  );
}
