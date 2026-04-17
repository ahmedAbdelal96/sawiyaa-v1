import { ChatApprovalStatus, ConversationStatus } from '@prisma/client';

export const CARE_CHAT_REQUEST_DECISION_VALUES = ['APPROVE', 'REJECT'] as const;

export type CareChatRequestDecision =
  (typeof CARE_CHAT_REQUEST_DECISION_VALUES)[number];

export const CARE_CHAT_REQUEST_ACTIVE_STATUSES: ChatApprovalStatus[] = [
  ChatApprovalStatus.PENDING,
  ChatApprovalStatus.APPROVED,
];

export const CARE_CHAT_DEFAULT_EXPIRY_DAYS = 30;

export const CARE_CHAT_ACTIVITY_STATE_VALUES = [
  'ACTIVE',
  'EXPIRED',
  'REVOKED',
  'CLOSED',
] as const;

export type CareChatActivityState =
  (typeof CARE_CHAT_ACTIVITY_STATE_VALUES)[number];

export type CareChatActorType = 'PATIENT' | 'PRACTITIONER' | 'ADMIN';

export type CareChatSendValidationInput = {
  conversationStatus: ConversationStatus;
  approvalStatus: ChatApprovalStatus;
  expiresAt: Date | null;
  now: Date;
};
