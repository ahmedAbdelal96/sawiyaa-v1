import { useQuery } from "@tanstack/react-query";
import {
  getCareRequestsReportOverview,
  getPaymentsRevenueReportOverview,
  getPayoutsReportOverview,
  getSessionsReportOverview,
  getSupportReportOverview,
  listCareRequestsReportRows,
  listPaymentsRevenueReportRows,
  listPayoutsReportRows,
  listSessionsReportRows,
  listSupportReportRows,
} from "../api/admin-reports.api";
import { adminReportsQueryKeys } from "../constants/query-keys";
import type { ReportRangeQuery, ReportRowsQuery } from "../types/admin-reports.types";

export function useSessionsReportOverview(params: ReportRangeQuery) {
  return useQuery({
    queryKey: adminReportsQueryKeys.sessionsOverview(params),
    queryFn: () => getSessionsReportOverview(params),
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function useSessionsReportRows(params: ReportRowsQuery) {
  return useQuery({
    queryKey: adminReportsQueryKeys.sessionsRows(params),
    queryFn: () => listSessionsReportRows(params),
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function usePaymentsRevenueReportOverview(params: ReportRangeQuery) {
  return useQuery({
    queryKey: adminReportsQueryKeys.paymentsOverview(params),
    queryFn: () => getPaymentsRevenueReportOverview(params),
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function usePaymentsRevenueReportRows(params: ReportRowsQuery) {
  return useQuery({
    queryKey: adminReportsQueryKeys.paymentsRows(params),
    queryFn: () => listPaymentsRevenueReportRows(params),
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function useSupportReportOverview(params: ReportRangeQuery) {
  return useQuery({
    queryKey: adminReportsQueryKeys.supportOverview(params),
    queryFn: () => getSupportReportOverview(params),
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function useSupportReportRows(params: ReportRowsQuery) {
  return useQuery({
    queryKey: adminReportsQueryKeys.supportRows(params),
    queryFn: () => listSupportReportRows(params),
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function useCareRequestsReportOverview(params: ReportRangeQuery) {
  return useQuery({
    queryKey: adminReportsQueryKeys.careOverview(params),
    queryFn: () => getCareRequestsReportOverview(params),
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function useCareRequestsReportRows(params: ReportRowsQuery) {
  return useQuery({
    queryKey: adminReportsQueryKeys.careRows(params),
    queryFn: () => listCareRequestsReportRows(params),
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function usePayoutsReportOverview(params: ReportRangeQuery) {
  return useQuery({
    queryKey: adminReportsQueryKeys.payoutsOverview(params),
    queryFn: () => getPayoutsReportOverview(params),
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function usePayoutsReportRows(params: ReportRowsQuery) {
  return useQuery({
    queryKey: adminReportsQueryKeys.payoutsRows(params),
    queryFn: () => listPayoutsReportRows(params),
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

