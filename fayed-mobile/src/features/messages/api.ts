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
