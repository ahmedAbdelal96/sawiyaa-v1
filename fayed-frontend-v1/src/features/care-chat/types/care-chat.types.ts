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

export type CareChatParticipantRole =
  | "PATIENT"
  | "PRACTITIONER"
  | "SUPPORT_AGENT"
  | "ADMIN"
  | "SYSTEM";

export type CareChatDecision = "APPROVE" | "REJECT";

export type CareChatParticipantSummary = {
  id: string;
  displayName: string | null;
};

export type CareChatRequestItem = {
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
};

export type AdminCareChatRequestItem = CareChatRequestItem & {
  internalReviewNote: string | null;
};

export type CareChatMessage = {
  id: string;
  senderRole: CareChatParticipantRole;
  message: string;
  createdAt: string;
  readAt: string | null;
};

export type CareChatConversationDetails = {
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
  messages: CareChatMessage[];
};

export type CareChatPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type CareChatListParams = {
  page?: number;
  limit?: number;
  status?: CareChatRequestStatus;
};

export type CareChatListResponse<TItem = CareChatRequestItem> = {
  items: TItem[];
  pagination: CareChatPagination;
};

export type CareChatRequestResponse<TItem = CareChatRequestItem> = {
  item: TItem;
};

export type CareChatConversationResponse = {
  item: CareChatConversationDetails;
};

export type CreateCareChatRequestInput = {
  practitionerSlug: string;
  relatedSessionId?: string;
  reason?: string;
};

export type SendCareChatMessageInput = {
  message: string;
};

export type DecideCareChatRequestInput = {
  decision: CareChatDecision;
  expiresAt?: string;
  note?: string;
};

export type RevokeCareChatRequestInput = {
  note?: string;
};

export type CareChatDecisionResponse = {
  decision: CareChatDecision;
  item: AdminCareChatRequestItem;
};
