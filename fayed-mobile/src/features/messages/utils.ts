import type {
  GeneralChatConversationDetailItemDto,
  GeneralChatConversationListItemDto,
  GeneralChatMessageItemDto,
  GeneralChatParticipantSummaryDto,
  MessagesRole,
} from "./types";
import { safeDisplayText } from "./inbox-types";

function isArabicLocale(locale?: string) {
  return locale?.startsWith("ar") ?? false;
}

export function formatMessageTimestamp(
  value: string | null | undefined,
  locale: string,
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatMessageTime(
  value: string | null | undefined,
  locale: string,
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function sortMessagesChronologically(
  items: GeneralChatMessageItemDto[],
) {
  return [...items].sort((left, right) => {
    const leftAt = new Date(left.sentAt).getTime();
    const rightAt = new Date(right.sentAt).getTime();

    if (leftAt !== rightAt) {
      return leftAt - rightAt;
    }

    return left.messageId.localeCompare(right.messageId);
  });
}

export function uniqByMessageId(items: GeneralChatMessageItemDto[]) {
  const seen = new Set<string>();
  const result: GeneralChatMessageItemDto[] = [];

  for (const item of items) {
    if (seen.has(item.messageId)) {
      continue;
    }
    seen.add(item.messageId);
    result.push(item);
  }

  return result;
}

export function getConversationPrimaryParticipant(
  conversation:
    | GeneralChatConversationListItemDto
    | GeneralChatConversationDetailItemDto
    | null
    | undefined,
  currentUserId?: string | null,
) {
  if (!conversation) {
    return null;
  }

  const participants = conversation.participants ?? [];
  if (participants.length === 0) {
    return null;
  }

  const counterpart = participants.find((participant) => participant.userId !== currentUserId);
  return counterpart ?? participants[0] ?? null;
}

export function getParticipantDisplayName(
  participant: GeneralChatParticipantSummaryDto | null | undefined,
  fallback: string,
) {
  const name = safeDisplayText(participant?.identity?.displayName, "");
  if (name) {
    return name;
  }

  return fallback;
}

export function getParticipantSubtitle(
  participant: GeneralChatParticipantSummaryDto | null | undefined,
  fallback: string | null = null,
) {
  const subtitle = safeDisplayText(participant?.identity?.subtitle, "");
  if (subtitle) {
    return subtitle;
  }

  return fallback;
}

export function getParticipantAvatarUrl(
  participant: GeneralChatParticipantSummaryDto | null | undefined,
) {
  return participant?.identity?.avatarUrl?.trim() || null;
}

export function getParticipantStatusLabel(
  participant: GeneralChatParticipantSummaryDto | null | undefined,
  locale?: string,
) {
  const status = participant?.identity?.verificationStatus?.trim();
  const fallbackStatus = participant?.identity?.status?.trim() || null;
  const value = status || fallbackStatus;
  if (!value) {
    return null;
  }

  if (!isArabicLocale(locale)) {
    return value;
  }

  switch (value) {
    case "APPROVED":
      return "معتمد";
    case "PENDING":
      return "قيد المراجعة";
    case "REJECTED":
      return "مرفوض";
    case "SUSPENDED":
      return "موقوف";
    case "INACTIVE":
      return "غير نشط";
    default:
      return value.replaceAll("_", " ");
  }
}

export function getParticipantInitials(
  participant: GeneralChatParticipantSummaryDto | null | undefined,
  fallback: string,
) {
  const base = safeDisplayText(participant?.identity?.displayName, fallback) || fallback;
  const parts = base.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "M";
}

export function getConversationDisplayName(
  conversation:
    | GeneralChatConversationListItemDto
    | GeneralChatConversationDetailItemDto
    | null
    | undefined,
  role: MessagesRole,
  currentUserId?: string | null,
  locale?: string,
) {
  const isArabic = isArabicLocale(locale);
  const primaryParticipant = getConversationPrimaryParticipant(conversation, currentUserId);
  const fallbackName =
    role === "patient"
      ? (isArabic ? "المختص" : "Practitioner")
      : (isArabic ? "المريض" : "Patient");
  const primaryName = primaryParticipant
    ? getParticipantDisplayName(primaryParticipant, fallbackName)
    : null;
  const safePrimaryName = safeDisplayText(primaryName, "");

  if (safePrimaryName) {
    return conversation?.linkedSessionId
      ? isArabic
        ? `جلسة مع ${safePrimaryName}`
        : `Session with ${safePrimaryName}`
      : safePrimaryName;
  }

  if (!conversation) {
    return role === "patient"
      ? (isArabic ? "محادثة جلسة" : "Session conversation")
      : (isArabic ? "محادثة جلسة" : "Session conversation");
  }

  return role === "patient"
    ? (isArabic ? "محادثة جلسة" : "Session conversation")
    : (isArabic ? "محادثة جلسة" : "Session conversation");
}

export function getConversationSubLabel(
  conversation:
    | GeneralChatConversationListItemDto
    | GeneralChatConversationDetailItemDto
    | null
    | undefined,
  currentUserId?: string | null,
  locale?: string,
) {
  if (!conversation) {
    return null;
  }

  const primaryParticipant = getConversationPrimaryParticipant(conversation, currentUserId);
  const subtitle = getParticipantSubtitle(primaryParticipant, null);
  if (subtitle) {
    return subtitle;
  }

  const isArabic = isArabicLocale(locale);
  return conversation.linkedSessionId
    ? isArabic
      ? "محادثة جلسة"
      : "Session conversation"
    : isArabic
    ? "محادثة"
    : "Conversation";
}

export function getConversationParticipantLabels(role: MessagesRole, locale?: string) {
  const isArabic = isArabicLocale(locale);
  return role === "patient"
    ? { self: isArabic ? "أنت" : "You", other: isArabic ? "المختص" : "Practitioner" }
    : { self: isArabic ? "أنت" : "You", other: isArabic ? "المريض" : "Patient" };
}

export function getConversationIdentitySummary(
  conversation:
    | GeneralChatConversationListItemDto
    | GeneralChatConversationDetailItemDto
    | null
    | undefined,
  role: MessagesRole,
  currentUserId?: string | null,
  locale?: string,
) {
  const isArabic = isArabicLocale(locale);
  const participantLabels = getConversationParticipantLabels(role, locale);
  const primaryParticipant = getConversationPrimaryParticipant(conversation, currentUserId);
  const counterpartName = getParticipantDisplayName(
    primaryParticipant,
    participantLabels.other,
  );
  const counterpartStatus = getParticipantStatusLabel(primaryParticipant, locale);

  const base = isArabic
    ? `أنت و${counterpartName}`
    : `You and ${counterpartName}`;

  return counterpartStatus ? `${base} · ${counterpartStatus}` : base;
}

export function getConversationAvatarLabel(
  conversation:
    | GeneralChatConversationListItemDto
    | GeneralChatConversationDetailItemDto
    | null
    | undefined,
  currentUserId?: string | null,
) {
  const primaryParticipant = getConversationPrimaryParticipant(conversation, currentUserId);
  return getParticipantInitials(primaryParticipant, "M");
}

export function getConversationStatusTone(status: string | null | undefined) {
  switch (status) {
    case "OPEN":
    case "PENDING":
      return "success" as const;
    case "CLOSED":
    case "EXPIRED":
    case "SUSPENDED":
      return "default" as const;
    default:
      return "info" as const;
  }
}

export function getConversationStatusLabel(
  status: string | null | undefined,
  locale?: string,
) {
  if (!status) {
    return "-";
  }

  if (!isArabicLocale(locale)) {
    return status.replaceAll("_", " ");
  }

  switch (status) {
    case "OPEN":
      return "مفتوح";
    case "PENDING":
      return "قيد الانتظار";
    case "CLOSED":
      return "مغلق";
    case "EXPIRED":
      return "منتهي";
    case "SUSPENDED":
      return "موقوف";
    default:
      return status.replaceAll("_", " ");
  }
}

export function getMessageStatusLabel(
  status: string | null | undefined,
  locale?: string,
) {
  if (!status) return "-";

  if (!isArabicLocale(locale)) {
    switch (status) {
      case "SENT":
        return "Sent";
      case "DELIVERED":
        return "Delivered";
      case "READ":
        return "Read";
      case "FAILED":
        return "Failed";
      case "DELETED":
        return "Deleted";
      default:
        return status;
    }
  }

  switch (status) {
    case "SENT":
      return "تم الإرسال";
    case "DELIVERED":
      return "تم التسليم";
    case "READ":
      return "مقروء";
    case "FAILED":
      return "فشل الإرسال";
    case "DELETED":
      return "محذوف";
    default:
      return status.replaceAll("_", " ");
  }
}

export function getMessageSenderLabel(
  message: GeneralChatMessageItemDto,
  currentUserId: string | null | undefined,
  role: MessagesRole,
  locale?: string,
) {
  const isArabic = isArabicLocale(locale);

  if (message.messageType === "SYSTEM") {
    return isArabic ? "النظام" : "System";
  }

  if (message.senderUserId && currentUserId && message.senderUserId === currentUserId) {
    return isArabic ? "أنت" : "You";
  }

  const displayName = safeDisplayText(message.senderIdentity?.displayName, "");
  if (displayName) {
    return displayName;
  }

  return role === "patient"
    ? (isArabic ? "المختص" : "Practitioner")
    : (isArabic ? "المريض" : "Patient");
}

export function getMessageSenderRoleLabel(
  message: GeneralChatMessageItemDto,
  currentUserId: string | null | undefined,
  role: MessagesRole,
  locale?: string,
) {
  const isArabic = isArabicLocale(locale);

  if (message.messageType === "SYSTEM") {
    return isArabic ? "النظام" : "System";
  }

  if (message.senderUserId && currentUserId && message.senderUserId === currentUserId) {
    return role === "patient"
      ? (isArabic ? "المريض" : "Patient")
      : (isArabic ? "المختص" : "Practitioner");
  }

  const subtitle = safeDisplayText(message.senderIdentity?.subtitle, "");
  if (subtitle) {
    return subtitle;
  }

  const status = message.senderIdentity?.status?.trim();
  if (status) {
    return isArabicLocale(locale) ? status.replaceAll("_", " ") : status;
  }

  return role === "patient"
    ? (isArabic ? "المختص" : "Practitioner")
    : (isArabic ? "المريض" : "Patient");
}

export function isSameSenderMessage(
  left: GeneralChatMessageItemDto | null | undefined,
  right: GeneralChatMessageItemDto | null | undefined,
) {
  if (!left || !right) {
    return false;
  }

  if (left.messageType === "SYSTEM" || right.messageType === "SYSTEM") {
    return false;
  }

  return left.senderUserId === right.senderUserId;
}
