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
  requestedByUserId: string;
  reviewedByUserId: string | null;
  approvalRef: string | null;
};

