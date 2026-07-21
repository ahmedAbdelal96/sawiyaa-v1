import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type {
  CanonicalConversation,
  CanonicalConversationListResponse,
  CanonicalMessageListResponse,
  CanonicalUnreadSummary,
  MessagingMessage,
} from "../types/messages-shell.types";

function isCanonicalUnreadSummary(value: unknown): value is CanonicalUnreadSummary {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.unreadCount === "number" &&
    typeof candidate.needsSupportReplyCount === "number" &&
    typeof candidate.hasUnread === "boolean"
  );
}

export async function listCanonicalConversations(params: { page?: number; limit?: number } = {}) {
  const response = await httpClient.get<ApiPayload<CanonicalConversationListResponse>>(
    "/messages/conversations",
    { params },
  );
  return extractData(response.data);
}

export async function getCanonicalConversation(conversationId: string) {
  const response = await httpClient.get<ApiPayload<{ item: CanonicalConversation }>>(
    `/messages/conversations/${conversationId}`,
  );
  return extractData(response.data);
}

export async function listCanonicalMessages(
  conversationId: string,
  params: { page?: number; limit?: number } = {},
) {
  const response = await httpClient.get<ApiPayload<CanonicalMessageListResponse>>(
    `/messages/conversations/${conversationId}/messages`,
    { params },
  );
  return extractData(response.data);
}

export async function sendCanonicalMessage(
  conversationId: string,
  payload: { message: string; clientMessageId: string; attachments?: Array<any> },
) {
  const response = await httpClient.post<ApiPayload<{ item: MessagingMessage }>>(
    `/messages/conversations/${conversationId}/messages`,
    payload,
  );
  return extractData(response.data);
}

export async function markCanonicalConversationRead(
  conversationId: string,
  payload: { lastReadMessageId: string },
) {
  const response = await httpClient.post<ApiPayload<{ item: any }>>(
    `/messages/conversations/${conversationId}/read`,
    payload,
  );
  return extractData(response.data);
}

export async function getCanonicalUnreadSummary() {
  const response = await httpClient.get<ApiPayload<{ item: CanonicalUnreadSummary }>>(
    "/messages/conversations/unread-summary",
  );
  const data = extractData(response.data) as unknown;
  const item =
    data && typeof data === "object" && "item" in data
      ? (data as { item?: unknown }).item
      : data;

  if (!isCanonicalUnreadSummary(item)) {
    throw new Error("Invalid canonical unread summary response");
  }

  return { item };
}

export async function createPatientSupportTicket(payload: { description: string }) {
  const response = await httpClient.post<ApiPayload<{ item: any }>>(
    "/patients/me/support/tickets",
    { category: "GENERAL", description: payload.description },
  );
  return extractData(response.data);
}

export async function createPractitionerSupportTicket(payload: { description: string }) {
  const response = await httpClient.post<ApiPayload<{ item: any }>>(
    "/practitioners/me/support/tickets",
    { category: "GENERAL", description: payload.description },
  );
  return extractData(response.data);
}

export async function updateSupportTicketStatus(ticketId: string, status: string) {
  const response = await httpClient.patch<ApiPayload<{ item: any }>>(
    `/admin/support/tickets/${ticketId}/status`,
    { status },
  );
  return extractData(response.data);
}

export async function getUnifiedMessagingUnreadSummary() {
  const summary = await getCanonicalUnreadSummary();
  return {
    item: {
      session: { unreadMessages: 0, unreadConversations: 0 },
      support: { unreadMessages: summary.item.needsSupportReplyCount, unreadConversations: 0 },
      practitioner: { unreadMessages: 0, unreadConversations: 0 },
      totalUnreadMessages: summary.item.unreadCount || summary.item.needsSupportReplyCount,
      totalUnreadConversations: 0,
    },
  };
}

export async function getAdminSupportTickets(params: { status?: string; page?: number; limit?: number } = {}) {
  const response = await httpClient.get<ApiPayload<{ items: any[]; pagination: any }>>(
    "/admin/support/tickets",
    {
      params: {
        page: params.page,
        limit: params.limit,
        status: params.status,
      },
    },
  );
  return extractData(response.data);
}

export async function getAdminSupportTicket(ticketId: string) {
  const response = await httpClient.get<ApiPayload<{ item: any }>>(
    `/admin/support/tickets/${ticketId}`,
  );
  return extractData(response.data);
}
