import type { AdminChatConversationListQuery } from "../types/admin-chat-conversations.types";

export const adminChatConversationsQueryKeys = {
  all: ["admin-chat-conversations"] as const,
  list: (query: AdminChatConversationListQuery) =>
    [
      ...adminChatConversationsQueryKeys.all,
      "list",
      query.page,
      query.limit,
      query.search ?? "",
      query.status ?? "",
      query.patientId ?? "",
      query.practitionerId ?? "",
      query.sessionId ?? "",
      query.fromDate ?? "",
      query.toDate ?? "",
      query.hasAttachmentsOnly ? "1" : "0",
      query.sortBy ?? "lastMessageAt",
      query.sortDirection ?? "desc",
    ] as const,
  detail: (conversationId: string) =>
    [...adminChatConversationsQueryKeys.all, "detail", conversationId] as const,
  messages: (conversationId: string, page: number, limit: number) =>
    [...adminChatConversationsQueryKeys.all, "messages", conversationId, page, limit] as const,
};
