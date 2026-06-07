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

function isArabicLocale(locale?: string) {
  return locale?.startsWith("ar") ?? false;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLikelyInternalId(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return true;
  }

  if (trimmed.startsWith("gc_")) {
    return true;
  }

  if (UUID_RE.test(trimmed)) {
    return true;
  }

  if (/^[0-9a-f]{16,}$/i.test(trimmed)) {
    return true;
  }

  if (/^[A-Za-z0-9_-]{24,}$/.test(trimmed) && /[0-9]/.test(trimmed)) {
    return true;
  }

  return false;
}

export function safeDisplayText(
  value: string | null | undefined,
  fallback: string | null,
) {
  const trimmed = value?.trim();
  if (!trimmed || isLikelyInternalId(trimmed)) {
    return fallback;
  }

  return trimmed;
}

export function buildSessionInboxItem(
  conversation: GeneralChatConversationListItemDto,
  role: MessagesRole,
  locale?: string,
): NormalizedInboxItem {
  const isArabic = isArabicLocale(locale);
  const counterpart = conversation.participants.find(
    (p) =>
      p.role === (role === "patient" ? "PRACTITIONER" : "PATIENT"),
  );
  const displayName = safeDisplayText(counterpart?.identity?.displayName, null);
  const title = displayName
    ? isArabic
      ? `جلسة مع ${displayName}`
      : `Session with ${displayName}`
    : isArabic
    ? "محادثة جلسة"
    : "Session conversation";

  const subtitle = conversation.linkedSessionId
    ? isArabic
      ? "محادثة جلسة"
      : "Session conversation"
    : isArabic
    ? "محادثة"
    : "Conversation";

  const preview =
    safeDisplayText(conversation.latestMessage?.previewText, null) ||
    (isArabic ? "لا توجد رسائل بعد." : "No messages yet.");

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
  locale?: string,
): NormalizedInboxItem {
  const isArabic = isArabicLocale(locale);
  const title = safeDisplayText(ticket.subject, null) ||
    (isArabic ? "محادثة الدعم" : "Support conversation");
  return {
    id: ticket.id,
    sourceType: "support",
    title,
    subtitle: null,
    preview: isArabic ? "محادثة الدعم" : "Support conversation",
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
  locale?: string,
): NormalizedInboxItem {
  const isArabic = isArabicLocale(locale);
  const name =
    role === "patient"
      ? request.practitioner.displayName
      : request.patient.displayName;
  const safeName = safeDisplayText(name, null);
  const safeReason = safeDisplayText(request.reason, null);

  return {
    id: request.linkedConversationId ?? request.id,
    sourceType: "care",
    title: safeName || (isArabic ? "متابعة" : "Follow-up"),
    subtitle: safeReason,
    preview: safeReason || (isArabic ? "متابعة" : "Follow-up conversation"),
    latestActivityAt: request.requestedAt,
    unreadCount: request.unreadCount,
    status: request.status,
    destinationRoute:
      role === "patient"
        ? request.linkedConversationId
          ? `/(patient)/care-chat/${request.linkedConversationId}`
          : `/(patient)/care-chat/request/${request.id}`
        : request.linkedConversationId
        ? `/(practitioner)/messages/${request.linkedConversationId}?source=care`
        : `/(practitioner)/messages?tab=followup`,
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
