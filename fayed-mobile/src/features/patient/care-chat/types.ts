export type ChatApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "REVOKED";

export type ConversationStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";

export type CareChatActivityState = "ACTIVE" | "EXPIRED" | "REVOKED" | "CLOSED";

export type MessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED";

export type ConversationParticipantRole =
  | "PATIENT"
  | "PRACTITIONER"
  | "ADMIN"
  | "SYSTEM";

export interface CareChatParticipantSummaryDto {
  id: string;
  displayName: string | null;
}

export interface CareChatMessageDto {
  id: string;
  senderUserId: string | null;
  senderRole: ConversationParticipantRole;
  message: string;
  status: MessageStatus;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface CareChatRequestItemDto {
  id: string;
  status: ChatApprovalStatus;
  reason: string | null;
  relatedSessionId: string | null;
  linkedConversationId: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  patient: CareChatParticipantSummaryDto;
  practitioner: CareChatParticipantSummaryDto;
  unreadCount: number;
  hasUnread: boolean;
}

export interface CareChatConversationDetailsDto {
  id: string;
  status: ConversationStatus;
  activityState: CareChatActivityState;
  canSendMessage: boolean;
  linkedRequestId: string | null;
  relatedSessionId: string | null;
  expiresAt: string | null;
  closedAt: string | null;
  patient: CareChatParticipantSummaryDto;
  practitioner: CareChatParticipantSummaryDto;
  messages: CareChatMessageDto[];
}

export interface CareChatRequestPaginationDto {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface CareChatRequestListResponseData {
  items: CareChatRequestItemDto[];
  pagination: CareChatRequestPaginationDto;
}

export interface CreateCareChatRequestPayload {
  practitionerSlug: string;
  relatedSessionId?: string;
  reason?: string;
}

export interface ListCareChatRequestsQuery {
  page?: number;
  limit?: number;
  status?: ChatApprovalStatus;
}
