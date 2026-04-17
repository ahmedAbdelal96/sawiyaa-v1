import type {
  MatchingCreateInput,
  MatchingSession,
} from "@/modules/matching/domain/matching.types";
import { unwrapApiData } from "@/networking/contracts/api-envelope";
import { httpClient } from "@/networking/http/client";

export async function createMatchingSessionRequest(payload: MatchingCreateInput) {
  const response = await httpClient.post<MatchingSession>("/matching/sessions", payload);
  return unwrapApiData(response.data);
}

export async function getMatchingSessionRequest(sessionId: string) {
  const response = await httpClient.get<MatchingSession>(`/matching/sessions/${sessionId}`);
  return unwrapApiData(response.data);
}
