import type { MessagesRole, CanonicalConversation } from "./types";
import type { NormalizedInboxItem } from "./inbox-types";
import { sortInboxItemsByActivity } from "./inbox-types";
import { getConversationHeaderPresentation } from "./utils";

export function mapCanonicalConversationToInboxItem(
  conversation: CanonicalConversation,
  role: MessagesRole,
  _locale: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): NormalizedInboxItem {
  const header = getConversationHeaderPresentation(conversation, role, t);

  return {
    id: conversation.conversationId,
    sourceType: conversation.type.toLowerCase() as "session" | "support" | "care",
    title: header.title,
    subtitle: header.subtitle,
    preview:
      (conversation.lastMessage?.attachments?.length ?? 0) > 0
        ? t("messages.inbox.attachmentPreview")
        : conversation.lastMessage?.body?.trim() || t("messages.inbox.noPreview"),
    latestActivityAt: conversation.lastActivityAt || conversation.createdAt,
    unreadCount: Math.max(0, conversation.unreadCount ?? 0),
    status: conversation.status,
    destinationRoute:
      role === "patient"
        ? `/(patient)/messages/${conversation.conversationId}`
        : `/(practitioner)/messages/${conversation.conversationId}`,
    raw: conversation,
  };
}

export function sortCanonicalConversationsForInbox(
  conversations: CanonicalConversation[],
  role: MessagesRole,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  return sortInboxItemsByActivity(
    conversations.map((conversation) =>
      mapCanonicalConversationToInboxItem(conversation, role, locale, t),
    ),
  );
}
