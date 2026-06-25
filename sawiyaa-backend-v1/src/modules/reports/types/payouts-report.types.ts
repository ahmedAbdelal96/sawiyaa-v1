export type PayoutsReportOverview = {
  generatedAt: string;
  range: { from: string; to: string };
  currencyCode: string | null;
  practitionerId: string | null;
  totals: {
    paidAmountInRange: string;
    payoutCountInRange: string;
    transferFeesInRange: string;
    missingProofCountInRange: string;
    dueOutstandingAsOfTo: string;
    settlementsWithDueCount: string;
  };
  trend: Array<{
    date: string;
    payoutAmount: string;
    payoutCount: string;
  }>;
};

export type PayoutsReportRow = {
  payoutId: string;
  settlementId: string;
  batchId: string;
  practitionerId: string;
  practitionerName: string | null;
  amountPaid: string;
  currencyCode: string;
  payoutMethod: string;
  payoutSource: string;
  transferFeeAmount: string | null;
  transferFeeTreatment: string;
  externalPayoutRef: string | null;
  effectiveAt: string;
  createdAt: string;
  processedByUserId: string | null;
  proofUploaded: boolean;
};
