import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  ExecuteModerationActionInput,
  ListModerationReportsParams,
  ModerationActionExecutionData,
  ModerationReportDetailData,
  ModerationReportsListData,
} from "../types/admin-moderation-reports.types";

export async function listAdminModerationReports(params: ListModerationReportsParams) {
  const response = await httpClient.get<ApiPayload<ModerationReportsListData>>(
    "/admin/moderation/reports",
    { params },
  );

  return extractData(response.data);
}

export async function getAdminModerationReport(reportId: string) {
  const response = await httpClient.get<ApiPayload<ModerationReportDetailData>>(
    `/admin/moderation/reports/${reportId}`,
  );

  return extractData(response.data);
}

export async function executeAdminModerationAction(
  reportId: string,
  payload: ExecuteModerationActionInput,
) {
  const response = await httpClient.patch<ApiPayload<ModerationActionExecutionData>>(
    `/admin/moderation/reports/${reportId}/actions`,
    payload,
  );

  return extractData(response.data);
}
