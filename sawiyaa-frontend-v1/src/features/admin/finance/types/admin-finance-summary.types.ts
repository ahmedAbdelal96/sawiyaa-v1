export type AdminFinancialBucket = {
  currency: string;
  amount: string;
  count: number;
};

export type AdminFinancialBalanceBucket = AdminFinancialBucket & {
  availableAmount: string;
  lockedOrReservedAmount: string;
};

export type AdminFinancialStatusBucket = {
  status: string;
  currency: string;
  count: number;
};

export type AdminFinancialOverview = {
  asOf: string;
  filters: Record<string, string | null>;
  metrics: {
    grossPatientCollections: AdminFinancialBucket[];
    patientWalletCredits: AdminFinancialBucket[];
    completedServiceEconomicValue: AdminFinancialBucket[];
    awaitingAccountantReview: AdminFinancialBucket[];
    awaitingAccountantReviewSuggestedPractitioner: AdminFinancialBucket[];
    accountantApprovedAwaitingWalletCredit: AdminFinancialBucket[];
    accountantApprovedAlreadyWalletCredited: AdminFinancialBucket[];
    practitionerWalletCredits: AdminFinancialBucket[];
    outstandingPractitionerWalletLiability: AdminFinancialBucket[];
    availableForPayout: AdminFinancialBucket[];
    currentPractitionerWalletBalances: AdminFinancialBalanceBucket[];
    completedExternalPractitionerPayouts: AdminFinancialBucket[];
    completedExternalPayoutDebits: AdminFinancialBucket[];
    pendingExternalPractitionerPayouts: AdminFinancialBucket[];
    failedOrReversedExternalPayouts: AdminFinancialBucket[];
    platformSuggestedShare: AdminFinancialBucket[];
    platformRemainderAfterDecision: AdminFinancialBucket[];
    accountingAdditions: AdminFinancialBucket[];
    accountingDeductions: AdminFinancialBucket[];
    rejectedOrExcludedCandidates: AdminFinancialBucket[];
    paymentStatusCounts: AdminFinancialStatusBucket[];
  };
};

export type AdminFinancialOverviewScope = "accounting" | "collections" | "wallets" | "payouts";
export type AdminFinancialOverviewFilters = Record<string, string | undefined>;

/** Compatibility contract for the existing finance hub navigation cards. */
export type AdminFinanceHubSummary = {
  generatedAt: string;
  pendingSessionEarningReviewsCount: number;
  pendingSessionEarningReviewsAmountByCurrency: { currencyCode: string; amount: number }[];
  openPractitionerRecoveriesCount: number;
  openPractitionerRecoveriesAmountByCurrency: { currencyCode: string; amount: number }[];
  readyPractitionerSettlementsCount: number;
  readyPractitionerSettlementsAmountByCurrency: { currencyCode: string; amount: number }[];
  pendingReconciliationReviewsCount: number;
  openAccountingIssuesCount: number;
};
