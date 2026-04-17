import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  executeAdminModerationAction,
  getAdminModerationReport,
  listAdminModerationReports,
} from "../api/admin-moderation-reports.api";
import { adminModerationReportsQueryKeys } from "../constants/query-keys";
import type {
  ExecuteModerationActionInput,
  ListModerationReportsParams,
} from "../types/admin-moderation-reports.types";

export function useAdminModerationReports(params: ListModerationReportsParams) {
  return useQuery({
    queryKey: adminModerationReportsQueryKeys.list(params),
    queryFn: () => listAdminModerationReports(params),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminModerationReportDetail(reportId?: string) {
  return useQuery({
    queryKey: adminModerationReportsQueryKeys.detail(reportId ?? ""),
    queryFn: () => getAdminModerationReport(reportId as string),
    enabled: Boolean(reportId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useExecuteAdminModerationAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportId,
      payload,
    }: {
      reportId: string;
      payload: ExecuteModerationActionInput;
    }) => executeAdminModerationAction(reportId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminModerationReportsQueryKeys.detail(variables.reportId),
      });
      queryClient.invalidateQueries({
        queryKey: adminModerationReportsQueryKeys.all,
      });
    },
  });
}
