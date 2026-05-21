import { ConversationStatus } from '@prisma/client';

export const ADMIN_GENERAL_CHAT_CONVERSATION_STATUS_VALUES = [
  'ACTIVE',
  'SENDING_DISABLED',
  'CLOSED_BY_PRACTITIONER',
  'ARCHIVED',
] as const;

export type AdminGeneralChatConversationStatus =
  (typeof ADMIN_GENERAL_CHAT_CONVERSATION_STATUS_VALUES)[number];

export const ADMIN_GENERAL_CHAT_MESSAGE_PREVIEW_TYPE_VALUES = [
  'NO_MESSAGES',
  'TEXT_MESSAGE',
  'ATTACHMENT',
  'TEXT_WITH_ATTACHMENT',
] as const;

export type AdminGeneralChatMessagePreviewType =
  (typeof ADMIN_GENERAL_CHAT_MESSAGE_PREVIEW_TYPE_VALUES)[number];

export const ADMIN_GENERAL_CHAT_LOCK_OWNER_VALUES = [
  'ADMIN',
  'PRACTITIONER',
] as const;

export type AdminGeneralChatLockOwner =
  (typeof ADMIN_GENERAL_CHAT_LOCK_OWNER_VALUES)[number];

export const GENERAL_CHAT_SENDABLE_CONVERSATION_STATUSES: ConversationStatus[] =
  [ConversationStatus.OPEN, ConversationStatus.PENDING];

