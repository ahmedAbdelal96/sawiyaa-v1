import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  CreateMatchingSessionRequest,
  MatchingSession,
} from "../types/guided-matching.types";

export async function createMatchingSession(
  data: CreateMatchingSessionRequest,
): Promise<MatchingSession> {
  const response = await httpClient.post<ApiPayload<MatchingSession>>(
    "/matching/sessions",
    data,
  );
  return extractData(response.data);
}

export async function getMatchingSession(sessionId: string): Promise<MatchingSession> {
  const response = await httpClient.get<ApiPayload<MatchingSession>>(
    `/matching/sessions/${sessionId}`,
  );
  return extractData(response.data);
}
