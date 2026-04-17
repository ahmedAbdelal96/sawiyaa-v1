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

export type SupportTicketPriority = "LOW" | "NORMAL" | "MEDIUM" | "HIGH" | "URGENT";

export type SupportTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_USER"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";

export type SupportMessage = {
  id: string;
  senderRole: "PATIENT" | "PRACTITIONER" | "SUPPORT_AGENT" | "ADMIN" | "SYSTEM";
  message: string;
  createdAt: string;
};

export type SupportTicketItem = {
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
};

export type SupportTicketDetails = SupportTicketItem & {
  description: string | null;
  messages: SupportMessage[];
};

export type SupportTicketListDataResponse = {
  items: SupportTicketItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export type SupportTicketItemDataResponse = {
  item: SupportTicketDetails;
};

export type CreateSupportTicketInput = {
  category: SupportTicketType;
  subject: string;
  description: string;
  priority?: SupportTicketPriority;
  relatedSessionId?: string;
  relatedPaymentId?: string;
};
