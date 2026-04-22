import { apiClient, extractApiData } from "../../../lib/api";
import type {
  ListSessionsQuery,
  PractitionerSessionDetails,
  PractitionerSessionJoinContract,
  PractitionerSessionRuntime,
  SessionsListResponse,
} from "./types";

export async function getPractitionerSessions(query?: ListSessionsQuery) {
  const response = await apiClient.get("/practitioners/me/sessions", {
    params: query,
  });
  return extractApiData<SessionsListResponse>(response);
}

export async function getPractitionerSession(sessionId: string) {
  const response = await apiClient.get(
    `/practitioners/me/sessions/${sessionId}`,
  );
  return extractApiData<{ item: PractitionerSessionDetails }>(response);
}

export async function preparePractitionerSessionRuntime(sessionId: string) {
  const response = await apiClient.post(
    `/practitioners/me/sessions/${sessionId}/runtime/prepare`,
  );
  return extractApiData<{ item: PractitionerSessionRuntime }>(response);
}

export async function resolvePractitionerSessionJoinContract(
  sessionId: string,
) {
  const response = await apiClient.get(
    `/practitioners/me/sessions/${sessionId}/runtime/join`,
  );
  return extractApiData<{ item: PractitionerSessionJoinContract }>(response);
}

export async function markPractitionerSessionCompleted(sessionId: string) {
  const response = await apiClient.post(
    `/practitioners/me/sessions/${sessionId}/mark-completed`,
  );
  return extractApiData<{ item: PractitionerSessionDetails }>(response);
}

export async function markPractitionerSessionNoShow(sessionId: string) {
  const response = await apiClient.post(
    `/practitioners/me/sessions/${sessionId}/mark-no-show`,
  );
  return extractApiData<{ item: PractitionerSessionDetails }>(response);
}
