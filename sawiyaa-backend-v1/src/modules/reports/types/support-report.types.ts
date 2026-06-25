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
