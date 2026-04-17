export type CareChatRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "REVOKED";

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
  patient: {
    id: string;
    displayName: string | null;
  };
  practitioner: {
    id: string;
    displayName: string | null;
  };
};

export type CareChatRequestListDataResponse = {
  items: CareChatRequestItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export type CareChatRequestItemDataResponse = {
  item: CareChatRequestItem;
};

export type CareChatConversationMessage = {
  id: string;
  senderRole: "PATIENT" | "PRACTITIONER" | "SUPPORT_AGENT" | "ADMIN" | "SYSTEM";
  message: string;
  createdAt: string;
  readAt: string | null;
};

export type CareChatConversationItem = {
  id: string;
  status: "OPEN" | "PENDING" | "CLOSED" | "EXPIRED" | "SUSPENDED";
  activityState: string;
  canSendMessage: boolean;
  linkedRequestId: string | null;
  relatedSessionId: string | null;
  expiresAt: string | null;
  closedAt: string | null;
  patient: {
    id: string;
    displayName: string | null;
  };
  practitioner: {
    id: string;
    displayName: string | null;
  };
  messages: CareChatConversationMessage[];
};

export type CareChatConversationDataResponse = {
  item: CareChatConversationItem;
};

export type CreateCareChatRequestInput = {
  practitionerSlug: string;
  relatedSessionId?: string;
  reason?: string;
};
