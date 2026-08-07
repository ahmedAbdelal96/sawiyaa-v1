import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type { PatientRemedy, PractitionerRemedy, ResolutionCase, ResolutionOutcome } from "./types";

export async function listResolutionCases() {
  const response = await httpClient.get<ApiPayload<ResolutionCase[]>>("/admin/sessions/resolution-cases");
  return extractData(response.data);
}
export async function executeResolution(sessionId: string, body: { attendanceOutcome: ResolutionOutcome; patientRemedy: PatientRemedy; practitionerRemedy: PractitionerRemedy; reasonCode: string; adminNotes: string; idempotencyKey: string; replacementStartAt?: string }) {
  const response = await httpClient.post<ApiPayload<unknown>>(`/admin/sessions/${sessionId}/resolution`, body);
  return extractData(response.data);
}
