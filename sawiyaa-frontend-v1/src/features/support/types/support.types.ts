export type SupportTicketCategory =
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

export type SupportMessageSenderRole =
  | "PATIENT"
  | "PRACTITIONER"
  | "SUPPORT_AGENT"
  | "ADMIN"
  | "SYSTEM";

export type SupportMessageStatus =
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "DELETED";

export interface SupportMessage {
  id: string;
  senderUserId: string | null;
  senderRole: SupportMessageSenderRole;
  message: string;
  status: SupportMessageStatus;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface SupportTicketSummary {
  id: string;
  category: SupportTicketCategory;
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

export interface SupportTicketDetails extends SupportTicketSummary {
  conversationId: string;
  description: string | null;
  messages: SupportMessage[];
}

export interface SupportTicketsPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface SupportTicketsListResponse {
  items: SupportTicketSummary[];
  pagination: SupportTicketsPagination;
}

export interface SupportTicketResponse {
  item: SupportTicketDetails;
}

export interface SupportTicketsListParams {
  page?: number;
  limit?: number;
  status?: SupportTicketStatus;
  category?: SupportTicketCategory;
  priority?: SupportTicketPriority;
}

export interface CreateSupportTicketRequest {
  category: SupportTicketCategory;
  subject: string;
  description: string;
  priority?: SupportTicketPriority;
  relatedSessionId?: string;
  relatedPaymentId?: string;
  relatedInstantBookingRequestId?: string;
  relatedMatchingSessionId?: string;
  relatedAssessmentSubmissionId?: string;
}

export interface AddSupportMessageRequest {
  message: string;
}

// Admin-only types

export interface SupportInternalNote {
  id: string;
  note: string;
  createdAt: string;
}

export interface AdminSupportTicketDetails extends SupportTicketDetails {
  internalNotes: SupportInternalNote[];
}

export interface AdminSupportTicketResponse {
  item: AdminSupportTicketDetails;
}

export interface AdminSupportListParams extends SupportTicketsListParams {
  assignedToMe?: boolean;
}

export interface UpdateSupportTicketStatusRequest {
  status: SupportTicketStatus;
}

export interface AssignSupportTicketRequest {
  assignedAdminUserId?: string | null;
}

export interface CreateAdminSupportTicketForReporterRequest {
  reporterUserId: string;
  reporterRole: "PATIENT" | "PRACTITIONER";
  category?: SupportTicketCategory;
  subject?: string;
  description?: string;
  priority?: SupportTicketPriority;
}
