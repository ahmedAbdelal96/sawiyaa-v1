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
import { useSessionRole } from "@/lib/auth/use-session-role";
import { isAdminRole } from "@/lib/auth/roles";

export function useAdminModerationReports(params: ListModerationReportsParams) {
  const role = useSessionRole();
  return useQuery({
    queryKey: adminModerationReportsQueryKeys.list(params),
    queryFn: () => listAdminModerationReports(params),
    enabled: isAdminRole(role),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminModerationReportDetail(reportId?: string) {
  const role = useSessionRole();
  return useQuery({
    queryKey: adminModerationReportsQueryKeys.detail(reportId ?? ""),
    queryFn: () => getAdminModerationReport(reportId as string),
    enabled: isAdminRole(role) && Boolean(reportId),
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
