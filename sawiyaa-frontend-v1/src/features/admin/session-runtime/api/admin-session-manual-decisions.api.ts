import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminSessionManualDecisionListResponseData,
  AdminSessionManualDecisionSuccessResponseData,
  CreateAdminSessionManualDecisionRequest,
} from "../types/admin-session-manual-decisions.types";

export async function getAdminSessionManualDecisions(
  sessionId: string,
): Promise<AdminSessionManualDecisionListResponseData> {
  const response = await httpClient.get<
    ApiPayload<AdminSessionManualDecisionListResponseData>
  >(`/admin/sessions/${sessionId}/manual-decisions`);
  return extractData(response.data);
}

export async function createAdminSessionManualDecision(
  sessionId: string,
  body: CreateAdminSessionManualDecisionRequest,
): Promise<AdminSessionManualDecisionSuccessResponseData> {
  const response = await httpClient.post<
    ApiPayload<AdminSessionManualDecisionSuccessResponseData>
  >(`/admin/sessions/${sessionId}/manual-decision`, body);
  return extractData(response.data);
}
