import type {
  GeneralChatConversationDetailItemDto,
  GeneralChatConversationListItemDto,
  GeneralChatMessageItemDto,
  GeneralChatParticipantSummaryDto,
  MessagesRole,
  CanonicalConversation,
} from "./types";
import { safeDisplayText } from "./inbox-types";
import {
  formatViewerDateTime,
  formatViewerTime,
} from "../../lib/time-formatting";

function isArabicLocale(locale?: string) {
  return locale?.startsWith("ar") ?? false;
}

export function formatMessageTimestamp(
  value: string | null | undefined,
  locale: string,
) {
  return formatViewerDateTime(value, {
    locale,
    fallbackText: "-",
  });
}

export function formatMessageTime(
  value: string | null | undefined,
  locale: string,
) {
  return formatViewerTime(value, {
    locale,
    fallbackText: "-",
  });
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

export type MessagingViewerRole = "patient" | "practitioner";

export interface ConversationHeaderPresentation {
  title: string;
  subtitle: string;
  context: "SESSION" | "CARE" | "SUPPORT";
}

export function getConversationHeaderPresentation(
  conversation: CanonicalConversation,
  viewerRole: MessagingViewerRole,
  t: (key: string, options?: any) => string,
): ConversationHeaderPresentation {
  const context = conversation.type;
  const counterpartName = conversation.otherParty?.displayName || conversation.title;

  if (context === "SESSION") {
    const isCounterpartPatient = conversation.otherParty?.publicRoleLabel === "Patient";
    const subtitleKey = isCounterpartPatient
      ? "messages.common.rolePatient"
      : "messages.common.rolePractitioner";

    const title = t("messages.thread.sessionWithCounterpart", { name: counterpartName });
    const subtitle = t(subtitleKey);

    return { title, subtitle, context };
  }

  if (context === "CARE") {
    const isCounterpartPatient = conversation.otherParty?.publicRoleLabel === "Patient";
    const subtitleKey = isCounterpartPatient
      ? "messages.common.rolePatient"
      : "messages.common.rolePractitioner";

    const title = t("messages.thread.careWithCounterpart", { name: counterpartName });
    const subtitle = t(subtitleKey);

    return { title, subtitle, context };
  }

  if (context === "SUPPORT") {
    const title = conversation.subject?.trim() || conversation.title?.trim() || t("messages.thread.supportFallback");
    const subtitle = t("messages.thread.supportRoleLabel");

    return { title, subtitle, context };
  }

  return {
    title: conversation.title,
    subtitle: "",
    context: "SESSION",
  };
}

export type ConversationStatusTone =
  | "active"
  | "waiting"
  | "resolved"
  | "ended"
  | "neutral";

export interface ConversationStatusPresentation {
  label: string;
  tone: ConversationStatusTone;
}

export function getConversationStatusPresentation(
  conversation: {
    type: "SESSION" | "CARE" | "SUPPORT" | string;
    status: string;
    isResolved?: boolean;
    supportQueueState?: string | null;
  } | null | undefined,
  locale: string,
): ConversationStatusPresentation | null {
  if (!conversation) return null;
  const isAr = locale.startsWith("ar");
  const statusVal = conversation.status?.toUpperCase() || "";

  if (conversation.type === "SESSION" || conversation.type === "CARE") {
    if (statusVal === "OPEN" || statusVal === "ACTIVE") {
      return { label: isAr ? "نشطة" : "Active", tone: "active" };
    }
    if (statusVal === "CLOSED" || statusVal === "EXPIRED") {
      return { label: isAr ? "انتهت" : "Ended", tone: "ended" };
    }
    return null;
  }

  if (conversation.type === "SUPPORT") {
    if (conversation.isResolved || statusVal === "RESOLVED" || statusVal === "CLOSED") {
      return { label: isAr ? "تم الحل" : "Resolved", tone: "resolved" };
    }
    const queue = conversation.supportQueueState?.toUpperCase();
    if (queue === "NEEDS_SUPPORT_REPLY") {
      return { label: isAr ? "في انتظار رد الدعم" : "Waiting for support", tone: "waiting" };
    }
    if (queue === "WAITING_FOR_USER") {
      return { label: isAr ? "بانتظار ردك" : "Waiting for your reply", tone: "waiting" };
    }
    return { label: isAr ? "مفتوح" : "Open", tone: "neutral" };
  }

  return null;
}

/** Colour tokens mapped from semantic tone — single source of truth for status colours. */
export const CONVERSATION_STATUS_TONE_COLORS: Record<ConversationStatusTone, string> = {
  active: "#24564F",   // Deep Teal
  waiting: "#C8A979",  // Warm Gold
  resolved: "#6F7E78", // Muted Grey
  ended: "#6F7E78",    // Muted Grey
  neutral: "#24564F",  // Deep Teal (Open = positive)
};

/** @deprecated use getConversationStatusPresentation instead */
export function getConversationStatusPresenter(
  conversation: {
    type: "SESSION" | "CARE" | "SUPPORT" | string;
    status: string;
    isResolved?: boolean;
    supportQueueState?: string | null;
  } | null | undefined,
  locale: string,
): string | null {
  return getConversationStatusPresentation(conversation, locale)?.label ?? null;
}

/** @deprecated use CONVERSATION_STATUS_TONE_COLORS[tone] instead */
export function getConversationStatusColor(_label: string | null, _locale: string): string {
  // This shim is kept for callers that have not yet migrated to tone-based styling.
  // It always returns muted grey as the safe fallback since callers should migrate.
  return "#6F7E78";
}

export function formatInboxRelativeTime(
  value: string | null | undefined,
  locale: string,
): string {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";

  const isAr = locale.startsWith("ar");
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) {
    return isAr ? "الآن" : "Now";
  }

  if (diffMins < 60) {
    if (isAr) {
      if (diffMins === 1) return "منذ دقيقة";
      if (diffMins === 2) return "منذ دقيقتين";
      if (diffMins >= 3 && diffMins <= 10) return `منذ ${diffMins} دقائق`;
      return `منذ ${diffMins} دقيقة`;
    }
    return `${diffMins}m ago`;
  }

  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isSameDay) {
    if (isAr) {
      if (diffHours === 1) return "منذ ساعة";
      if (diffHours === 2) return "منذ ساعتين";
      if (diffHours >= 3 && diffHours <= 10) return `منذ ${diffHours} ساعات`;
      return `منذ ${diffHours} ساعة`;
    }
    return `${diffHours}h ago`;
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return isAr ? "أمس" : "Yesterday";
  }

  const monthsAr = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  const monthsEn = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const day = date.getDate();
  const monthIdx = date.getMonth();

  if (isAr) {
    return `${day} ${monthsAr[monthIdx]}`;
  }
  return `${monthsEn[monthIdx]} ${day}`;
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
  deliveryState?: "sending" | "sent" | "failed",
) {
  if (deliveryState === "sending") return isArabicLocale(locale) ? "جارٍ الإرسال" : "Sending";
  if (deliveryState === "failed") return isArabicLocale(locale) ? "تعذّر الإرسال" : "Not sent";
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

  // Always prefer the actual display name — support employees must remain individually identifiable.
  const displayName = safeDisplayText(message.senderIdentity?.displayName, "");
  if (displayName) {
    return displayName;
  }

  // Only use generic label when identity is genuinely missing.
  const publicRole = message.senderIdentity?.publicRoleLabel;
  const isSupport = publicRole === "Support team" || publicRole === "Admin";
  if (isSupport) {
    // Keep the shared inbox label separate from an individual responder fallback.
    return isArabic ? "عضو في فريق الدعم" : "Support team member";
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

  const publicRole = message.senderIdentity?.publicRoleLabel;
  const isSupport = publicRole === "Support team" || publicRole === "Admin";
  if (isSupport) {
    return isArabic ? "فريق الدعم" : "Support Team";
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
