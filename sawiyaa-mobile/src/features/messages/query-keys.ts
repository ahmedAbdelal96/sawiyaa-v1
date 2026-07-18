import type {
  ListGeneralChatConversationsParams,
  ListGeneralChatMessagesParams,
  MessagesRole,
} from "./types";

export const generalChatQueryKeys = {
  all: ["general-chat"] as const,
  role: (role: MessagesRole) => [...generalChatQueryKeys.all, role] as const,
  conversations: (
    role: MessagesRole,
    params?: Omit<ListGeneralChatConversationsParams, "page">,
  ) => [...generalChatQueryKeys.role(role), "conversations", params ?? {}] as const,
  conversation: (role: MessagesRole, conversationId: string) =>
    [...generalChatQueryKeys.role(role), "conversation", conversationId] as const,
  messages: (
    role: MessagesRole,
    conversationId: string,
    params?: Omit<ListGeneralChatMessagesParams, "page">,
  ) =>
    [...generalChatQueryKeys.role(role), "messages", conversationId, params ?? {}] as const,
  unreadSummary: (role: MessagesRole) =>
    [...generalChatQueryKeys.role(role), "unread-summary"] as const,
  sessionConversation: (role: MessagesRole, sessionId: string) =>
    [...generalChatQueryKeys.role(role), "session-conversation", sessionId] as const,
  canonicalConversations: () => ["canonical-conversations"] as const,
  canonicalConversation: (conversationId: string) => ["canonical-conversation", conversationId] as const,
  canonicalMessages: (conversationId: string) => ["canonical-messages", conversationId] as const,
  canonicalUnreadSummary: () => ["canonical-unread-summary"] as const,
};

