import {
  ConversationParticipantRole,
  ConversationStatus,
} from '@prisma/client';

export const GENERAL_CHAT_ALLOWED_PARTICIPANT_ROLES = [
  ConversationParticipantRole.PATIENT,
  ConversationParticipantRole.PRACTITIONER,
] as const;

export type GeneralChatParticipantRole =
  (typeof GENERAL_CHAT_ALLOWED_PARTICIPANT_ROLES)[number];

export const GENERAL_CHAT_ALLOWED_CONVERSATION_STATUS = [
  ConversationStatus.OPEN,
  ConversationStatus.PENDING,
] as const;

export const GENERAL_CHAT_AVAILABILITY_REASONS = {
  allowed: 'ALLOWED',
  sessionNotStarted: 'SESSION_NOT_STARTED',
  sessionEnded: 'SESSION_ENDED',
  sessionCancelled: 'SESSION_CANCELLED',
  conversationClosed: 'CONVERSATION_CLOSED',
  moderationLocked: 'MODERATION_LOCKED',
  notParticipant: 'NOT_PARTICIPANT',
} as const;

export type GeneralChatAvailabilityReason =
  (typeof GENERAL_CHAT_AVAILABILITY_REASONS)[keyof typeof GENERAL_CHAT_AVAILABILITY_REASONS];

export interface GeneralChatAvailabilityViewModel {
  canRead: boolean;
  canSend: boolean;
  readOnly: boolean;
  reason: GeneralChatAvailabilityReason;
}

export const GENERAL_CHAT_ERROR_CODES = {
  participantRoleForbidden: 'GENERAL_CHAT_PARTICIPANT_ROLE_FORBIDDEN',
  participantPairForbidden: 'GENERAL_CHAT_PARTICIPANT_PAIR_FORBIDDEN',
  participantNotFound: 'GENERAL_CHAT_PARTICIPANT_NOT_FOUND',
  selfConversationForbidden: 'GENERAL_CHAT_SELF_CONVERSATION_FORBIDDEN',
  linkedSessionForbidden: 'GENERAL_CHAT_LINKED_SESSION_FORBIDDEN',
  conversationBoundaryViolation: 'GENERAL_CHAT_CONVERSATION_BOUNDARY_VIOLATION',
  conversationNotFound: 'GENERAL_CHAT_CONVERSATION_NOT_FOUND',
  conversationAccessDenied: 'GENERAL_CHAT_CONVERSATION_ACCESS_DENIED',
  conversationNotSendable: 'GENERAL_CHAT_CONVERSATION_NOT_SENDABLE',
  sessionChatReadOnly: 'GENERAL_CHAT_SESSION_CHAT_READ_ONLY',
  messageNotFound: 'GENERAL_CHAT_MESSAGE_NOT_FOUND',
  messageContentRequired: 'GENERAL_CHAT_MESSAGE_CONTENT_REQUIRED',
  attachmentRefInvalid: 'GENERAL_CHAT_ATTACHMENT_REF_INVALID',
} as const;
