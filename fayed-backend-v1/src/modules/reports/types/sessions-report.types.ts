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

export type SessionsReportRow = {
  id: string;
  sessionCode: string;
  status: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  createdAt: string;
  patientId: string;
  practitionerId: string;
};

