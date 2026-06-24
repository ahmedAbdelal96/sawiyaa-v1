import type {
  GeneralChatConversationIdentity,
  GeneralChatConversationParticipant,
  GeneralChatParticipantIdentity,
  GeneralChatMessageItem,
} from "../types/general-chat.types";

type GeneralChatParticipantLike = {
  identity: GeneralChatConversationParticipant["identity"];
};

export function getConversationPrimaryParticipant(
  conversation: GeneralChatConversationIdentity | null | undefined,
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
  participant: GeneralChatConversationParticipant | GeneralChatParticipantLike | null | undefined,
  fallback: string,
) {
  const name = participant?.identity?.displayName?.trim();
  return name && name.length > 0 ? name : fallback;
}

export function getParticipantSubtitle(
  participant: GeneralChatConversationParticipant | GeneralChatParticipantLike | null | undefined,
  fallback: string | null = null,
) {
  const subtitle = participant?.identity?.subtitle?.trim();
  return subtitle && subtitle.length > 0 ? subtitle : fallback;
}

export function getParticipantAvatarUrl(
  participant: GeneralChatConversationParticipant | GeneralChatParticipantLike | null | undefined,
) {
  return participant?.identity?.avatarUrl?.trim() || null;
}

export function getParticipantStatusLabel(
  participant: GeneralChatConversationParticipant | GeneralChatParticipantLike | null | undefined,
) {
  return (
    participant?.identity?.verificationStatus?.trim() ||
    participant?.identity?.status?.trim() ||
    null
  );
}

export function getParticipantInitials(
  participant: GeneralChatConversationParticipant | GeneralChatParticipantLike | null | undefined,
  fallback: string,
) {
  const base = participant?.identity?.displayName?.trim() || fallback;
  const parts = base.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "M";
}

export function getConversationDisplayName(
  conversation: GeneralChatConversationIdentity | null | undefined,
  currentUserId?: string | null,
  fallback = "Conversation",
) {
  const primaryParticipant = getConversationPrimaryParticipant(conversation, currentUserId);
  return primaryParticipant
    ? getParticipantDisplayName(primaryParticipant, fallback)
    : fallback;
}

export function getConversationSubtitle(
  conversation: GeneralChatConversationIdentity | null | undefined,
  currentUserId?: string | null,
) {
  const primaryParticipant = getConversationPrimaryParticipant(conversation, currentUserId);
  return primaryParticipant
    ? getParticipantSubtitle(primaryParticipant, null)
    : null;
}

export function getMessageSenderIdentity(
  message: GeneralChatMessageItem,
  conversation: GeneralChatConversationIdentity | null | undefined,
) {
  if (!message.senderUserId || !conversation) {
    return null;
  }

  return (
    conversation.participants.find((participant) => participant.userId === message.senderUserId) ??
    null
  );
}
