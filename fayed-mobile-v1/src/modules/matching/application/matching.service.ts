import {
  createMatchingSessionRequest,
  getMatchingSessionRequest,
} from "@/modules/matching/api/matching.api";
import type { MatchingCreateInput } from "@/modules/matching/domain/matching.types";

export const matchingService = {
  createSession(payload: MatchingCreateInput) {
    return createMatchingSessionRequest(payload);
  },
  getSession(sessionId: string) {
    return getMatchingSessionRequest(sessionId);
  },
};
