import type { CurrencyGroupedAmount } from "@/lib/finance-format";

export type AdminFinanceHubSummary = {
  generatedAt: string;
  pendingSessionEarningReviewsCount: number;
  pendingSessionEarningReviewsAmountByCurrency: CurrencyGroupedAmount[];
  openPractitionerRecoveriesCount: number;
  openPractitionerRecoveriesAmountByCurrency: CurrencyGroupedAmount[];
  readyPractitionerSettlementsCount: number;
  readyPractitionerSettlementsAmountByCurrency: CurrencyGroupedAmount[];
  pendingReconciliationReviewsCount: number;
  openAccountingIssuesCount: number;
};
