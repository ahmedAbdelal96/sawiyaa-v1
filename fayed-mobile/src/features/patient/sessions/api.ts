import { apiClient, extractApiData } from "../../../lib/api";
import type {
  CreateScheduledSessionPayload,
  CreateScheduledSessionResponse,
  ListSessionsQuery,
  PublicAvailabilityWindowsData,
  SessionCancellationPreviewResponse,
  SessionDetails,
  SessionJoinContractResponse,
  SessionsListResponse,
} from "./types";

export async function getPublicAvailabilityWindows(
  practitionerSlug: string,
  from: string,
  to: string,
  includeBooked = false,
) {
  const response = await apiClient.get(
    `/public/practitioners/${practitionerSlug}/availability/windows`,
    {
      params: { from, to, includeBooked },
    },
  );
  return extractApiData<PublicAvailabilityWindowsData>(response);
}

export async function createScheduledSession(
  payload: CreateScheduledSessionPayload,
) {
  const response = await apiClient.post("/patients/me/sessions", payload);
  return extractApiData<CreateScheduledSessionResponse>(response);
}

export async function getPatientSessions(query?: ListSessionsQuery) {
  const response = await apiClient.get("/patients/me/sessions", {
    params: query,
  });
  return extractApiData<SessionsListResponse>(response);
}

export async function getPatientSession(sessionId: string) {
  const response = await apiClient.get(`/patients/me/sessions/${sessionId}`);
  return extractApiData<{ item: SessionDetails }>(response);
}

export async function getPatientSessionCancellationPreview(sessionId: string) {
  const response = await apiClient.get(
    `/patients/me/sessions/${sessionId}/cancel-preview`,
  );
  return extractApiData<SessionCancellationPreviewResponse>(response);
}

export async function cancelPatientSession(sessionId: string, reason?: string) {
  const response = await apiClient.post(
    `/patients/me/sessions/${sessionId}/cancel`,
    reason ? { reason } : {},
  );
  return extractApiData<{ item: SessionDetails }>(response);
}

export async function resolvePatientSessionJoinContract(sessionId: string) {
  const response = await apiClient.get(
    `/patients/me/sessions/${sessionId}/runtime/join`,
  );
  return extractApiData<SessionJoinContractResponse>(response);
}
