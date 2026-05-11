import type {
  GeneralChatConversationDetailItemDto,
  GeneralChatConversationListItemDto,
  GeneralChatMessageItemDto,
  GeneralChatParticipantSummaryDto,
  MessagesRole,
} from "./types";

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
  const name = participant?.identity?.displayName?.trim();
  if (name) {
    return name;
  }

  return fallback;
}

export function getParticipantSubtitle(
  participant: GeneralChatParticipantSummaryDto | null | undefined,
  fallback: string | null = null,
) {
  const subtitle = participant?.identity?.subtitle?.trim();
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
) {
  const status = participant?.identity?.verificationStatus?.trim();
  if (status) {
    return status;
  }

  return participant?.identity?.status?.trim() || null;
}

export function getParticipantInitials(
  participant: GeneralChatParticipantSummaryDto | null | undefined,
  fallback: string,
) {
  const base = participant?.identity?.displayName?.trim() || fallback;
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
) {
  const primaryParticipant = getConversationPrimaryParticipant(conversation, currentUserId);
  const primaryName = primaryParticipant
    ? getParticipantDisplayName(
        primaryParticipant,
        role === "patient" ? "Practitioner" : "Patient",
      )
    : null;

  if (primaryName) {
    return primaryName;
  }

  if (!conversation) {
    return role === "patient" ? "Practitioner chat" : "Patient chat";
  }

  if (conversation.linkedSessionId) {
    return role === "patient" ? "Practitioner chat" : "Patient chat";
  }

  return role === "patient" ? "Practitioner chat" : "Patient chat";
}

export function getConversationSubLabel(
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

  const primaryParticipant = getConversationPrimaryParticipant(conversation, currentUserId);
  const subtitle = getParticipantSubtitle(primaryParticipant, null);
  if (subtitle) {
    return subtitle;
  }

  return conversation.linkedSessionId
    ? `Session #${conversation.conversationRef}`
    : `Conversation #${conversation.conversationRef}`;
}

export function getConversationParticipantLabels(role: MessagesRole) {
  return role === "patient"
    ? { self: "You", other: "Practitioner" }
    : { self: "You", other: "Patient" };
}

export function getConversationIdentitySummary(
  conversation:
    | GeneralChatConversationListItemDto
    | GeneralChatConversationDetailItemDto
    | null
    | undefined,
  role: MessagesRole,
  currentUserId?: string | null,
) {
  const participantLabels = getConversationParticipantLabels(role);
  const primaryParticipant = getConversationPrimaryParticipant(conversation, currentUserId);
  const counterpartName = getParticipantDisplayName(
    primaryParticipant,
    participantLabels.other,
  );
  const counterpartStatus = getParticipantStatusLabel(primaryParticipant);

  const base = conversation?.linkedSessionId
    ? `You and ${counterpartName}`
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
  return getParticipantInitials(primaryParticipant, conversation?.conversationRef ?? "M");
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

export function getMessageStatusLabel(status: string | null | undefined) {
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
      return status ?? "-";
  }
}

export function getMessageSenderLabel(
  message: GeneralChatMessageItemDto,
  currentUserId: string | null | undefined,
  role: MessagesRole,
) {
  if (message.messageType === "SYSTEM") {
    return "System";
  }

  if (message.senderUserId && currentUserId && message.senderUserId === currentUserId) {
    return "You";
  }

  const displayName = message.senderIdentity?.displayName?.trim();
  if (displayName) {
    return displayName;
  }

  return role === "patient" ? "Practitioner" : "Patient";
}

export function getMessageSenderRoleLabel(
  message: GeneralChatMessageItemDto,
  currentUserId: string | null | undefined,
  role: MessagesRole,
) {
  if (message.messageType === "SYSTEM") {
    return "System";
  }

  if (message.senderUserId && currentUserId && message.senderUserId === currentUserId) {
    return role === "patient" ? "Patient" : "Practitioner";
  }

  const subtitle = message.senderIdentity?.subtitle?.trim();
  if (subtitle) {
    return subtitle;
  }

  const status = message.senderIdentity?.status?.trim();
  if (status) {
    return status;
  }

  return role === "patient" ? "Practitioner" : "Patient";
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

export function getConversationLatestPreview(
  conversation:
    | GeneralChatConversationListItemDto
    | GeneralChatConversationDetailItemDto
    | null
    | undefined,
) {
  const preview = conversation?.latestMessage?.previewText?.trim();
  if (preview) {
    return preview;
  }

  if (conversation && "hasMessages" in conversation && conversation.hasMessages) {
    return "New messages are available.";
  }

  return "No messages yet.";
}

export function uniqByConversationId<T extends { conversationId: string }>(
  items: T[],
) {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (seen.has(item.conversationId)) {
      continue;
    }

    seen.add(item.conversationId);
    result.push(item);
  }

  return result;
}

export function uniqByMessageId<T extends { messageId: string }>(items: T[]) {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (seen.has(item.messageId)) {
      continue;
    }

    seen.add(item.messageId);
    result.push(item);
  }

  return result;
}
