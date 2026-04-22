import type { ReportRangeQuery, ReportRowsQuery } from "../types/admin-reports.types";

export const adminReportsQueryKeys = {
  sessionsOverview: (params: ReportRangeQuery) => ["adminReports", "sessions", "overview", params] as const,
  sessionsRows: (params: ReportRowsQuery) => ["adminReports", "sessions", "rows", params] as const,
  paymentsOverview: (params: ReportRangeQuery) => ["adminReports", "paymentsRevenue", "overview", params] as const,
  paymentsRows: (params: ReportRowsQuery) => ["adminReports", "paymentsRevenue", "rows", params] as const,
  supportOverview: (params: ReportRangeQuery) => ["adminReports", "support", "overview", params] as const,
  supportRows: (params: ReportRowsQuery) => ["adminReports", "support", "rows", params] as const,
  careOverview: (params: ReportRangeQuery) => ["adminReports", "careRequests", "overview", params] as const,
  careRows: (params: ReportRowsQuery) => ["adminReports", "careRequests", "rows", params] as const,
  payoutsOverview: (params: ReportRangeQuery) => ["adminReports", "payouts", "overview", params] as const,
  payoutsRows: (params: ReportRowsQuery) => ["adminReports", "payouts", "rows", params] as const,
};

