import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type { PatientRemedy, PractitionerRemedy, ResolutionCase, ResolutionFinding, ResolutionOutcome, ResolutionPreview } from "./types";

export async function listResolutionCases() {
  const response = await httpClient.get<ApiPayload<ResolutionCase[]>>("/admin/sessions/resolution-cases");
  return extractData(response.data);
}
export type ResolutionDecisionInput = { findingCode?: ResolutionFinding; attendanceOutcome?: ResolutionOutcome; patientRemedy: PatientRemedy; practitionerRemedy: PractitionerRemedy; reasonCode: string; customReasonNote?: string; adminNotes: string; idempotencyKey: string; previewHash?: string; replacementStartAt?: string };
export async function previewResolution(sessionId: string, body: ResolutionDecisionInput) {
  const response = await httpClient.post<ApiPayload<ResolutionPreview>>(`/admin/sessions/${sessionId}/resolution/preview`, body);
  return extractData(response.data);
}
export async function executeResolution(sessionId: string, body: ResolutionDecisionInput) {
  const response = await httpClient.post<ApiPayload<unknown>>(`/admin/sessions/${sessionId}/resolution`, body);
  return extractData(response.data);
}
