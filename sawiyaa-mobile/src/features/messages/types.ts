export type MessagesRole = "patient" | "practitioner";

export type GeneralChatParticipantRole = "PATIENT" | "PRACTITIONER";

export type GeneralChatParticipantIdentityDto = {
  participantId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: GeneralChatParticipantRole;
  subtitle: string | null;
  status: string | null;
  verificationStatus: string | null;
};

export type GeneralChatConversationStatus =
  | "OPEN"
  | "PENDING"
  | "CLOSED"
  | "EXPIRED"
  | "SUSPENDED"
  | string;

export type GeneralChatAvailabilityReason =
  | "ALLOWED"
  | "SESSION_NOT_STARTED"
  | "SESSION_ENDED"
  | "SESSION_CANCELLED"
  | "CONVERSATION_CLOSED"
  | "MODERATION_LOCKED"
  | "NOT_PARTICIPANT";

export interface GeneralChatAvailability {
  canRead: boolean;
  canSend: boolean;
  readOnly: boolean;
  reason: GeneralChatAvailabilityReason;
}

export type GeneralChatMessageType =
  | "TEXT"
  | "SYSTEM"
  | "FILE"
  | "IMAGE"
  | "NOTE_REFERENCE"
  | "APPROVAL_NOTICE"
  | string;

export type GeneralChatMessageStatus =
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "DELETED"
  | string;

export interface GeneralChatParticipantSummaryDto {
  userId: string;
  role: GeneralChatParticipantRole;
  identity: GeneralChatParticipantIdentityDto | null;
}

export interface GeneralChatLatestMessageSummaryDto {
  messageId: string;
  senderUserId: string | null;
  messageType: GeneralChatMessageType;
  previewText: string | null;
  sentAt: string;
  senderIdentity: GeneralChatParticipantIdentityDto | null;
}

export interface GeneralChatConversationListItemDto {
  conversationId: string;
  conversationRef: string;
  status: GeneralChatConversationStatus;
  linkedSessionId: string | null;
  participants: GeneralChatParticipantSummaryDto[];
  createdAt: string;
  latestActivityAt: string;
  latestMessage: GeneralChatLatestMessageSummaryDto | null;
  unreadCount: number;
  hasUnread: boolean;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
  chatAvailability: GeneralChatAvailability;
}

export interface GeneralChatConversationDetailItemDto
  extends GeneralChatConversationListItemDto {
  hasMessages: boolean;
}

export interface GeneralChatPaginationDto {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface GeneralChatConversationListResponse {
  items: GeneralChatConversationListItemDto[];
  pagination: GeneralChatPaginationDto;
}

export interface GeneralChatConversationDetailResponse {
  item: GeneralChatConversationDetailItemDto;
}

export interface GeneralChatMessageAttachmentDto {
  fileId: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number | null;
  originalName: string | null;
}

export interface GeneralChatMessageItemDto {
  messageId: string;
  conversationId: string;
  senderUserId: string | null;
  senderIdentity: GeneralChatParticipantIdentityDto | null;
  messageType: GeneralChatMessageType;
  status: GeneralChatMessageStatus;
  contentText: string | null;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  attachments: GeneralChatMessageAttachmentDto[];
  conversationLatestActivityAt: string;
}

export interface GeneralChatMessageListResponse {
  items: GeneralChatMessageItemDto[];
  pagination: GeneralChatPaginationDto;
}

export interface GeneralChatMessageReadStateItemDto {
  conversationId: string;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
  unreadCount: number;
  hasUnread: boolean;
}

export interface GeneralChatMessageReadStateResponse {
  item: GeneralChatMessageReadStateItemDto;
}

export interface GeneralChatUnreadLaneDto {
  unreadMessages: number;
  unreadConversations: number;
}

export interface UnifiedMessagingUnreadSummaryItemDto {
  session: GeneralChatUnreadLaneDto;
  support: GeneralChatUnreadLaneDto;
  practitioner: GeneralChatUnreadLaneDto;
  totalUnreadMessages: number;
  totalUnreadConversations: number;
}

export interface UnifiedMessagingUnreadSummaryResponse {
  item: UnifiedMessagingUnreadSummaryItemDto;
}

export interface ListGeneralChatConversationsParams {
  page?: number;
  limit?: number;
}

export interface ListGeneralChatMessagesParams {
  page?: number;
  limit?: number;
}

export interface SendGeneralChatMessageInput {
  message: string;
  attachments?: Array<{
    fileId: string;
    fileUrl: string;
    mimeType: string;
    fileSize?: number;
    originalName?: string;
  }>;
}

export interface SendGeneralChatMessageResponse {
  item: GeneralChatMessageItemDto;
}

export interface CreateGeneralChatConversationInput {
  targetUserId: string;
  targetRole: "PATIENT" | "PRACTITIONER";
  linkedSessionId?: string;
}

export interface GeneralChatConversationIdentityDto {
  conversationId: string;
  conversationRef: string;
  conversationType: "SYSTEM";
  status: GeneralChatConversationStatus;
  linkedSessionId: string | null;
  participants: GeneralChatParticipantSummaryDto[];
  wasCreated: boolean;
  chatAvailability: GeneralChatAvailability;
}

export interface GeneralChatOpenSessionResponse {
  item: GeneralChatConversationIdentityDto;
}
