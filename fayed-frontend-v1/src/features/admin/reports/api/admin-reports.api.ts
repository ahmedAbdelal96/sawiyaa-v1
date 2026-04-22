import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  CareRequestsReportOverview,
  Paginated,
  PaymentsRevenueReportOverview,
  PaymentsRevenueReportRow,
  PayoutsReportOverview,
  ReportRangeQuery,
  ReportRowsQuery,
  SessionsReportOverview,
  SessionsReportRow,
  SupportReportOverview,
  SupportReportRow,
  CareRequestsReportRow,
  PayoutsReportRow,
} from "../types/admin-reports.types";

export async function getSessionsReportOverview(params: ReportRangeQuery) {
  const response = await httpClient.get<ApiPayload<SessionsReportOverview>>(
    "/admin/reports/sessions/overview",
    { params },
  );
  return extractData(response.data);
}

export async function listSessionsReportRows(params: ReportRowsQuery) {
  const response = await httpClient.get<ApiPayload<Paginated<SessionsReportRow>>>(
    "/admin/reports/sessions/rows",
    { params },
  );
  return extractData(response.data);
}

export async function getPaymentsRevenueReportOverview(params: ReportRangeQuery) {
  const response = await httpClient.get<ApiPayload<PaymentsRevenueReportOverview>>(
    "/admin/reports/payments-revenue/overview",
    { params },
  );
  return extractData(response.data);
}

export async function listPaymentsRevenueReportRows(params: ReportRowsQuery) {
  const response = await httpClient.get<ApiPayload<Paginated<PaymentsRevenueReportRow>>>(
    "/admin/reports/payments-revenue/rows",
    { params },
  );
  return extractData(response.data);
}

export async function getSupportReportOverview(params: ReportRangeQuery) {
  const response = await httpClient.get<ApiPayload<SupportReportOverview>>(
    "/admin/reports/support/overview",
    { params },
  );
  return extractData(response.data);
}

export async function listSupportReportRows(params: ReportRowsQuery) {
  const response = await httpClient.get<ApiPayload<Paginated<SupportReportRow>>>(
    "/admin/reports/support/rows",
    { params },
  );
  return extractData(response.data);
}

export async function getCareRequestsReportOverview(params: ReportRangeQuery) {
  const response = await httpClient.get<ApiPayload<CareRequestsReportOverview>>(
    "/admin/reports/care-requests/overview",
    { params },
  );
  return extractData(response.data);
}

export async function listCareRequestsReportRows(params: ReportRowsQuery) {
  const response = await httpClient.get<ApiPayload<Paginated<CareRequestsReportRow>>>(
    "/admin/reports/care-requests/rows",
    { params },
  );
  return extractData(response.data);
}

export async function getPayoutsReportOverview(params: ReportRangeQuery) {
  const response = await httpClient.get<ApiPayload<PayoutsReportOverview>>(
    "/admin/reports/payouts/overview",
    { params },
  );
  return extractData(response.data);
}

export async function listPayoutsReportRows(params: ReportRowsQuery) {
  const response = await httpClient.get<ApiPayload<Paginated<PayoutsReportRow>>>(
    "/admin/reports/payouts/rows",
    { params },
  );
  return extractData(response.data);
}

