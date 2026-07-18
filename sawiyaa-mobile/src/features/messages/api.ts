import { apiClient, extractApiData } from "../../lib/api";
import type {
  CreateGeneralChatConversationInput,
  GeneralChatConversationDetailResponse,
  GeneralChatConversationListResponse,
  GeneralChatMessageReadStateResponse,
  GeneralChatMessageListResponse,
  GeneralChatOpenSessionResponse,
  ListGeneralChatConversationsParams,
  ListGeneralChatMessagesParams,
  SendGeneralChatMessageInput,
  SendGeneralChatMessageResponse,
  UnifiedMessagingUnreadSummaryResponse,
  CanonicalConversationListResponse,
  CanonicalConversation,
  CanonicalMessageListResponse,
  CanonicalUnreadSummaryResponse,
} from "./types";

export async function listMyGeneralChatConversations(
  params?: ListGeneralChatConversationsParams,
) {
  const response = await apiClient.get("/chat/conversations", { params });
  return extractApiData<GeneralChatConversationListResponse>(response);
}

export async function getMyGeneralChatConversationDetail(
  conversationId: string,
) {
  const response = await apiClient.get(`/chat/conversations/${conversationId}`);
  return extractApiData<GeneralChatConversationDetailResponse>(response);
}

export async function listMyGeneralChatMessages(
  conversationId: string,
  params?: ListGeneralChatMessagesParams,
) {
  const response = await apiClient.get(
    `/chat/conversations/${conversationId}/messages`,
    { params },
  );
  return extractApiData<GeneralChatMessageListResponse>(response);
}

export async function sendGeneralChatMessage(
  conversationId: string,
  payload: SendGeneralChatMessageInput,
) {
  const response = await apiClient.post(
    `/chat/conversations/${conversationId}/messages`,
    payload,
  );
  return extractApiData<SendGeneralChatMessageResponse>(response);
}

export async function markGeneralChatConversationRead(conversationId: string) {
  const response = await apiClient.post(`/chat/conversations/${conversationId}/read`, {});
  return extractApiData<GeneralChatMessageReadStateResponse>(response);
}

export async function openSessionGeneralChat(sessionId: string) {
  const response = await apiClient.post(`/chat/sessions/${sessionId}/open`);
  return extractApiData<GeneralChatOpenSessionResponse>(response);
}

export async function createOrGetGeneralChatConversation(
  payload: CreateGeneralChatConversationInput,
) {
  const response = await apiClient.post("/chat/conversations", payload);
  return extractApiData<GeneralChatOpenSessionResponse>(response);
}

export async function getMyGeneralChatUnreadSummary() {
  const response = await apiClient.get("/chat/conversations/unread-summary");
  return extractApiData<UnifiedMessagingUnreadSummaryResponse>(response);
}

export async function listCanonicalConversations(params?: { page?: number; limit?: number }) {
  const response = await apiClient.get("/messages/conversations", { params });
  return extractApiData<CanonicalConversationListResponse>(response);
}

export async function getCanonicalConversation(conversationId: string) {
  const response = await apiClient.get(`/messages/conversations/${conversationId}`);
  return extractApiData<{ item: CanonicalConversation }>(response);
}

export async function listCanonicalMessages(conversationId: string, params?: { page?: number; limit?: number }) {
  const response = await apiClient.get(`/messages/conversations/${conversationId}/messages`, { params });
  return extractApiData<CanonicalMessageListResponse>(response);
}

export async function sendCanonicalMessage(
  conversationId: string,
  payload: { message: string; clientMessageId: string },
) {
  const response = await apiClient.post(`/messages/conversations/${conversationId}/messages`, payload);
  return extractApiData<{ item: import("./types").CanonicalMessage }>(response);
}

export async function markCanonicalConversationRead(conversationId: string, payload: { lastReadMessageId: string }) {
  const response = await apiClient.post(`/messages/conversations/${conversationId}/read`, payload);
  return extractApiData<any>(response);
}

export async function getCanonicalUnreadSummary() {
  const response = await apiClient.get("/messages/conversations/unread-summary");
  return extractApiData<CanonicalUnreadSummaryResponse>(response);
}

export async function createPatientSupportTicket(payload: { description: string }) {
  const response = await apiClient.post("/patients/me/support/tickets", payload);
  return extractApiData<any>(response);
}

export async function createPractitionerSupportTicket(payload: { description: string }) {
  const response = await apiClient.post("/practitioners/me/support/tickets", payload);
  return extractApiData<any>(response);
}

