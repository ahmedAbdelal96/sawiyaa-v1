import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type {
  AdminChatConversationDetailResponse,
  AdminChatConversationDisableInput,
  AdminChatConversationEnableInput,
  AdminChatConversationListQuery,
  AdminChatConversationListResponse,
  AdminChatConversationMessagesResponse,
} from "../types/admin-chat-conversations.types";

export async function listAdminChatConversations(query: AdminChatConversationListQuery) {
  const response = await httpClient.get<ApiPayload<AdminChatConversationListResponse>>(
    "/admin/chat/conversations",
    { params: query },
  );

  return extractData(response.data);
}

export async function getAdminChatConversation(conversationId: string) {
  const response = await httpClient.get<ApiPayload<AdminChatConversationDetailResponse>>(
    `/admin/chat/conversations/${conversationId}`,
  );

  return extractData(response.data);
}

export async function listAdminChatConversationMessages(
  conversationId: string,
  params: { page: number; limit: number },
) {
  const response = await httpClient.get<ApiPayload<AdminChatConversationMessagesResponse>>(
    `/admin/chat/conversations/${conversationId}/messages`,
    { params },
  );

  return extractData(response.data);
}

export async function disableAdminChatConversation(
  conversationId: string,
  body: AdminChatConversationDisableInput,
) {
  const response = await httpClient.post<ApiPayload<AdminChatConversationDetailResponse>>(
    `/admin/chat/conversations/${conversationId}/disable`,
    body,
  );

  return extractData(response.data).item;
}

export async function enableAdminChatConversation(
  conversationId: string,
  body: AdminChatConversationEnableInput,
) {
  const response = await httpClient.post<ApiPayload<AdminChatConversationDetailResponse>>(
    `/admin/chat/conversations/${conversationId}/enable`,
    body,
  );

  return extractData(response.data).item;
}
