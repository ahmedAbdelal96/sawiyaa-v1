import { apiClient, extractApiData } from "../../lib/api";
import { Platform } from "react-native";
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
  ChatAttachmentPolicy,
} from "./types";
import type { SupportTicketCategory } from "../support/contracts";
import { normalizeCanonicalMessage } from "./message-identity";

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
  const response = await apiClient.post(
    `/chat/conversations/${conversationId}/read`,
    {},
  );
  return extractApiData<GeneralChatMessageReadStateResponse>(response);
}

export async function openSessionGeneralChat(sessionId: string) {
  const response = await apiClient.post(`/chat/sessions/${sessionId}/open`);
  return extractApiData<GeneralChatOpenSessionResponse>(response);
}

export async function getSessionGeneralChatConversation(sessionId: string) {
  const response = await apiClient.get(
    `/chat/sessions/${sessionId}/conversation`,
  );
  return extractApiData<{
    item: GeneralChatConversationDetailResponse["item"] | null;
    sessionId: string;
    chatAvailability: GeneralChatConversationDetailResponse["item"]["chatAvailability"];
  }>(response);
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

export async function listCanonicalConversations(params?: {
  page?: number;
  limit?: number;
}) {
  const response = await apiClient.get("/messages/conversations", { params });
  return extractApiData<CanonicalConversationListResponse>(response);
}

export async function getCanonicalConversation(conversationId: string) {
  const response = await apiClient.get(
    `/messages/conversations/${conversationId}`,
  );
  return extractApiData<{ item: CanonicalConversation }>(response);
}

export async function listCanonicalMessages(
  conversationId: string,
  params?: { page?: number; limit?: number },
) {
  const response = await apiClient.get(
    `/messages/conversations/${conversationId}/messages`,
    { params },
  );
  const data = extractApiData<CanonicalMessageListResponse>(response);
  return {
    ...data,
    items: data.items.map(normalizeCanonicalMessage),
  };
}

export async function sendCanonicalMessage(
  conversationId: string,
  payload: {
    message: string;
    clientMessageId: string;
    attachments?: {
      fileId: string;
      fileUrl: string;
      mimeType: string;
      fileSize?: number;
      originalName?: string;
    }[];
  },
) {
  const response = await apiClient.post(
    `/messages/conversations/${conversationId}/messages`,
    payload,
  );
  const data = extractApiData<{ item: import("./types").CanonicalMessage }>(response);
  return { ...data, item: normalizeCanonicalMessage(data.item) };
}

export async function markCanonicalConversationRead(
  conversationId: string,
  payload: { lastReadMessageId: string },
) {
  const response = await apiClient.post(
    `/messages/conversations/${conversationId}/read`,
    payload,
  );
  return extractApiData<any>(response);
}

export async function getCanonicalUnreadSummary() {
  const response = await apiClient.get(
    "/messages/conversations/unread-summary",
  );
  return extractApiData<CanonicalUnreadSummaryResponse>(response);
}

type NewSupportTicketPayload = {
  category?: SupportTicketCategory;
  description: string;
  newConversation?: boolean;
  idempotencyKey?: string;
};

function normalizeNewSupportTicketPayload(payload: NewSupportTicketPayload) {
  return {
    ...payload,
    category: payload.category ?? "GENERAL",
  };
}

export async function getChatAttachmentPolicy() {
  const response = await apiClient.get(
    "/messages/conversations/attachment-policy",
  );
  return extractApiData<{ item: ChatAttachmentPolicy }>(response);
}

export async function uploadCanonicalChatAttachment(
  conversationId: string,
  file: { uri: string; name: string; type: string },
) {
  const body = new FormData();
  if (Platform.OS === "web") {
    const source = await fetch(file.uri);
    const sourceBlob = await source.blob();
    body.append("file", new Blob([sourceBlob], { type: file.type }), file.name);
  } else {
    body.append("file", file as unknown as Blob);
  }
  const response = await apiClient.post(
    `/messages/conversations/${conversationId}/attachments`,
    body,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return extractApiData<{
    item: {
      fileId: string;
      fileUrl: string;
      mimeType: string;
      fileSize: number;
      originalName: string | null;
    };
  }>(response);
}

export async function createPatientSupportTicket(
  payload: NewSupportTicketPayload,
) {
  const response = await apiClient.post(
    "/patients/me/support/tickets",
    normalizeNewSupportTicketPayload(payload),
  );
  return extractApiData<any>(response);
}

export async function createPractitionerSupportTicket(
  payload: NewSupportTicketPayload,
) {
  const response = await apiClient.post(
    "/practitioners/me/support/tickets",
    normalizeNewSupportTicketPayload(payload),
  );
  return extractApiData<any>(response);
}
