export type CareChatRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "REVOKED";

export type CareChatConversationStatus =
  | "OPEN"
  | "PENDING"
  | "CLOSED"
  | "EXPIRED"
  | "SUSPENDED";

export type CareChatActivityState = "ACTIVE" | "EXPIRED" | "REVOKED" | "CLOSED";

export type CareChatMessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED";

export type CareChatParticipantRole =
  | "PATIENT"
  | "PRACTITIONER"
  | "SUPPORT_AGENT"
  | "ADMIN"
  | "SYSTEM";

export interface CareChatParticipantSummary {
  id: string;
  displayName: string | null;
}

export interface CareChatMessageDto {
  id: string;
  senderUserId: string | null;
  senderRole: CareChatParticipantRole;
  message: string;
  status: CareChatMessageStatus;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface CareChatRequestItemDto {
  id: string;
  status: CareChatRequestStatus;
  reason: string | null;
  relatedSessionId: string | null;
  linkedConversationId: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  patient: CareChatParticipantSummary;
  practitioner: CareChatParticipantSummary;
  unreadCount: number;
  hasUnread: boolean;
}

export interface CareChatConversationDetailsDto {
  id: string;
  status: CareChatConversationStatus;
  activityState: CareChatActivityState;
  canSendMessage: boolean;
  linkedRequestId: string | null;
  relatedSessionId: string | null;
  expiresAt: string | null;
  closedAt: string | null;
  patient: CareChatParticipantSummary;
  practitioner: CareChatParticipantSummary;
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

export interface ListCareChatRequestsQuery {
  page?: number;
  limit?: number;
  status?: CareChatRequestStatus;
}

