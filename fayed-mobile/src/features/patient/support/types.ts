export type SupportTicketType =
  | "BOOKING"
  | "PAYMENT"
  | "SESSION"
  | "TECHNICAL"
  | "ACCOUNT"
  | "MATCHING"
  | "GENERAL"
  | "CONTENT"
  | "CHAT"
  | "OTHER";

export type SupportTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_USER"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";

export type SupportTicketPriority =
  | "LOW"
  | "NORMAL"
  | "MEDIUM"
  | "HIGH"
  | "URGENT";

export type MessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED";

export type ConversationParticipantRole =
  | "PATIENT"
  | "PRACTITIONER"
  | "ADMIN"
  | "SYSTEM";

export interface SupportMessageDto {
  id: string;
  senderUserId: string | null;
  senderRole: ConversationParticipantRole;
  message: string;
  status: MessageStatus;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface SupportTicketItemDto {
  id: string;
  category: SupportTicketType;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assignedAdminUserId: string | null;
  relatedSessionId: string | null;
  relatedPaymentId: string | null;
  relatedInstantBookingRequestId: string | null;
  relatedMatchingSessionId: string | null;
  relatedAssessmentSubmissionId: string | null;
  lastMessageAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  unreadCount: number;
  hasUnread: boolean;
}

export interface SupportTicketDetailsDto extends SupportTicketItemDto {
  conversationId: string;
  description: string | null;
  messages: SupportMessageDto[];
}

export interface CreateSupportTicketPayload {
  category: SupportTicketType;
  subject: string;
  description: string;
  priority?: SupportTicketPriority;
  relatedSessionId?: string;
  relatedPaymentId?: string;
}

export interface ListSupportTicketsQuery {
  page?: number;
  limit?: number;
  status?: SupportTicketStatus;
  category?: SupportTicketType;
}

export interface SupportPaginationDto {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface SupportTicketListResponseData {
  items: SupportTicketItemDto[];
  pagination: SupportPaginationDto;
}
