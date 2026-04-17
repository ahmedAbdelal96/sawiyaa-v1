import type {
  SessionItemDataResponse,
  SessionJoinDataResponse,
  SessionRuntimeDataResponse,
  SessionsListDataResponse,
} from "@/modules/sessions/domain/sessions.types";
import { unwrapApiData } from "@/networking/contracts/api-envelope";
import { httpClient } from "@/networking/http/client";

export async function listMySessionsRequest(status?: string) {
  const response = await httpClient.get<SessionsListDataResponse>("/patients/me/sessions", {
    params: {
      page: 1,
      limit: 20,
      status,
    },
  });
  return unwrapApiData(response.data);
}

export async function getSessionDetailsRequest(sessionId: string) {
  const response = await httpClient.get<SessionItemDataResponse>(
    `/patients/me/sessions/${sessionId}`,
  );
  return unwrapApiData(response.data);
}

export async function cancelSessionRequest(sessionId: string, reason?: string) {
  const response = await httpClient.post<SessionItemDataResponse>(
    `/patients/me/sessions/${sessionId}/cancel`,
    { reason },
  );
  return unwrapApiData(response.data);
}

export async function prepareSessionRuntimeRequest(sessionId: string) {
  const response = await httpClient.post<SessionRuntimeDataResponse>(
    `/patients/me/sessions/${sessionId}/runtime/prepare`,
    {},
  );
  return unwrapApiData(response.data);
}

export async function resolveSessionJoinRequest(sessionId: string) {
  const response = await httpClient.get<SessionJoinDataResponse>(
    `/patients/me/sessions/${sessionId}/runtime/join`,
  );
  return unwrapApiData(response.data);
}
