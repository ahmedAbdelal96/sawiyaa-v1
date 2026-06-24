export type ReportRangeQuery = {
  from?: string | null;
  to?: string | null;
  currencyCode?: string | null;
  practitionerId?: string | null;
};

export type ReportRowsQuery = ReportRangeQuery & {
  page?: number;
  limit?: number;
  status?: string | null;
  sourceType?: string | null;
};

export type SessionsReportOverview = {
  generatedAt: string;
  range: { from: string; to: string };
  totals: {
    totalSessions: string;
    completed: string;
    cancelled: string;
    noShow: string;
  };
  statusBreakdown: Record<string, string>;
  trend: Array<{
    date: string;
    total: string;
    completed: string;
    cancelled: string;
    noShow: string;
  }>;
};

export type Paginated<T> = {
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  items: T[];
};

export type SessionsReportRow = {
  id: string;
  sessionCode: string;
  status: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  createdAt: string;
  patientId: string;
  practitionerId: string;
  patientName: string | null;
  practitionerName: string | null;
};

export type PaymentsRevenueReportOverview = {
  generatedAt: string;
  range: { from: string; to: string };
  currencyCode: string | null;
  kpis: {
    grossInflow: string;
    refundsTotal: string;
    platformRevenue: string;
    practitionerPayableOutstanding: string;
    vatTotal: string;
    feesTotal: string;
  };
  trend: Array<{
    date: string;
    grossInflow: string;
    revenue: string;
    refunds: string;
    fees: string;
  }>;
};

export type PaymentsRevenueReportRow = {
  journalEntryId: string;
  sourceType: string;
  sourceId: string;
  occurredAt: string;
  currencyCode: string;
  amount: string;
  summary: string;
};

export type SupportReportOverview = {
  generatedAt: string;
  range: { from: string; to: string };
  totals: {
    totalTickets: string;
    openTickets: string;
    resolvedTickets: string;
    closedTickets: string;
    overdueOpenTickets: string;
    avgCloseHours: string | null;
  };
  statusBreakdown: Record<string, string>;
  trend: Array<{
    date: string;
    created: string;
    resolvedOrClosed: string;
  }>;
};

export type SupportReportRow = {
  id: string;
  publicTicketRef: string | null;
  ticketType: string;
  status: string;
  priority: string;
  subject: string;
  createdAt: string;
  lastMessageAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  assignedToUserId: string | null;
  openedByUserId: string;
  patientId: string | null;
  practitionerId: string | null;
};

export type CareRequestsReportOverview = {
  generatedAt: string;
  range: { from: string; to: string };
  totals: {
    totalRequests: string;
    pending: string;
    approved: string;
    rejected: string;
    cancelled: string;
    expired: string;
    revoked: string;
    acceptanceRatePercent: string | null;
  };
  statusBreakdown: Record<string, string>;
  pendingAging: {
    lessThan1d: string;
    d1to3: string;
    d3to7: string;
    moreThan7: string;
  };
  trend: Array<{
    date: string;
    requested: string;
    approved: string;
    rejected: string;
  }>;
};

export type CareRequestsReportRow = {
  id: string;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  revokedAt: string | null;
  patientId: string;
  practitionerId: string;
  patientName: string | null;
  practitionerName: string | null;
  requestedByUserId: string;
  reviewedByUserId: string | null;
  approvalRef: string | null;
};

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

