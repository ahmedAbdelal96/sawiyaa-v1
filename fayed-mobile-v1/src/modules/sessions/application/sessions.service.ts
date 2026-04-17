import {
  cancelSessionRequest,
  getSessionDetailsRequest,
  listMySessionsRequest,
  prepareSessionRuntimeRequest,
  resolveSessionJoinRequest,
} from "@/modules/sessions/api/sessions.api";

export const sessionsService = {
  async listMySessions(status?: string) {
    return listMySessionsRequest(status);
  },

  async getSessionDetails(sessionId: string) {
    const response = await getSessionDetailsRequest(sessionId);
    return response.item;
  },

  async cancelSession(sessionId: string, reason?: string) {
    const response = await cancelSessionRequest(sessionId, reason);
    return response.item;
  },

  async prepareRuntime(sessionId: string) {
    const response = await prepareSessionRuntimeRequest(sessionId);
    return response.item;
  },

  async resolveJoin(sessionId: string) {
    const response = await resolveSessionJoinRequest(sessionId);
    return response.item;
  },
};
