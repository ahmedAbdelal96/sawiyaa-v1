import type { MessagesRole } from "./types";
import type {
  GeneralChatConversationListItemDto,
} from "./types";
import type {
  SupportTicketItemDto,
} from "../patient/support/types";
import type {
  CareChatRequestItemDto,
} from "../patient/care-chat/types";

export type InboxSourceType = "session" | "support" | "care";

export interface NormalizedInboxItem {
  id: string;
  sourceType: InboxSourceType;
  title: string;
  subtitle: string | null;
  preview: string;
  latestActivityAt: string;
  unreadCount: number;
  status: string;
  destinationRoute: string;
  raw:
    | GeneralChatConversationListItemDto
    | SupportTicketItemDto
    | CareChatRequestItemDto;
}

export function buildSessionInboxItem(
  conversation: GeneralChatConversationListItemDto,
  role: MessagesRole,
): NormalizedInboxItem {
  const counterpart = conversation.participants.find(
    (p) =>
      p.role === (role === "patient" ? "PRACTITIONER" : "PATIENT"),
  );
  const displayName = counterpart?.identity?.displayName?.trim() || null;
  const title = displayName
    ?? (role === "patient" ? "Practitioner" : "Patient");

  const subtitle = conversation.linkedSessionId
    ? `Session #${conversation.conversationRef}`
    : `Conversation #${conversation.conversationRef}`;

  const preview =
    conversation.latestMessage?.previewText?.trim() || "No messages yet.";

  return {
    id: conversation.conversationId,
    sourceType: "session",
    title,
    subtitle,
    preview,
    latestActivityAt: conversation.latestActivityAt,
    unreadCount: conversation.unreadCount ?? 0,
    status: conversation.status,
    destinationRoute:
      role === "patient"
        ? `/(patient)/messages/${conversation.conversationId}`
        : `/(practitioner)/messages/${conversation.conversationId}`,
    raw: conversation,
  };
}

export function buildSupportInboxItem(
  ticket: SupportTicketItemDto,
  role: MessagesRole,
): NormalizedInboxItem {
  return {
    id: ticket.id,
    sourceType: "support",
    title: ticket.subject,
    subtitle: null,
    preview: "Support conversation",
    latestActivityAt: ticket.lastMessageAt ?? ticket.createdAt,
    unreadCount: ticket.unreadCount,
    status: ticket.status,
    destinationRoute:
      role === "patient"
        ? `/(patient)/support/${ticket.id}`
        : `/(practitioner)/support/${ticket.id}`,
    raw: ticket,
  };
}

export function buildCareInboxItem(
  request: CareChatRequestItemDto,
  role: MessagesRole,
): NormalizedInboxItem {
  const name =
    role === "patient"
      ? request.practitioner.displayName
      : request.patient.displayName;

  return {
    id: request.linkedConversationId ?? request.id,
    sourceType: "care",
    title: name ?? (role === "patient" ? "Practitioner" : "Patient"),
    subtitle:
      request.reason?.trim() || null,
    preview: request.reason?.trim() || "Follow-up conversation",
    latestActivityAt: request.requestedAt,
    unreadCount: request.unreadCount,
    status: request.status,
    destinationRoute:
      role === "patient"
        ? request.linkedConversationId
          ? `/(patient)/care-chat/${request.linkedConversationId}`
          : `/(patient)/care-chat/request/${request.id}`
        : request.linkedConversationId
        ? `/(practitioner)/care-chat/${request.linkedConversationId}`
        : `/(practitioner)/care-chat/request/${request.id}`,
    raw: request,
  };
}

export function sortInboxItemsByActivity(items: NormalizedInboxItem[]) {
  return [...items].sort((left, right) => {
    const leftAt = new Date(left.latestActivityAt).getTime();
    const rightAt = new Date(right.latestActivityAt).getTime();
    if (leftAt !== rightAt) {
      return rightAt - leftAt;
    }
    return left.id.localeCompare(right.id);
  });
}
