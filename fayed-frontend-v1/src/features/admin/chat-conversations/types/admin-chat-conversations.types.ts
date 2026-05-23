export type AdminChatConversationStatus =
  | "ACTIVE"
  | "SENDING_DISABLED"
  | "CLOSED_BY_PRACTITIONER"
  | "ARCHIVED";

export type AdminChatConversationStatusFilter = AdminChatConversationStatus | "ALL";

export type AdminChatConversationSortBy =
  | "lastMessageAt"
  | "sessionDateTime"
  | "createdAt"
  | "updatedAt";

export type AdminChatConversationSortDirection = "asc" | "desc";

export type AdminChatConversationPreviewType =
  | "NO_MESSAGES"
  | "TEXT_MESSAGE"
  | "ATTACHMENT"
  | "TEXT_WITH_ATTACHMENT";

export type AdminChatConversationLockOwner = "ADMIN" | "PRACTITIONER";
export type AdminChatConversationSenderRole = "PATIENT" | "PRACTITIONER" | "SYSTEM";

export type AdminChatConversationPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type AdminChatConversationListQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: AdminChatConversationStatusFilter;
  patientId?: string;
  practitionerId?: string;
  sessionId?: string;
  fromDate?: string;
  toDate?: string;
  hasAttachmentsOnly?: boolean;
  sortBy?: AdminChatConversationSortBy;
  sortDirection?: AdminChatConversationSortDirection;
};

export type AdminChatConversationAttachment = {
  fileId: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number | null;
  originalName: string | null;
};

export type AdminChatConversationListItem = {
  conversationId: string;
  sessionId: string;
  sessionCode: string;
  patientName: string | null;
  patientEmail: string | null;
  practitionerName: string | null;
  practitionerEmail: string | null;
  sessionDateTime: string | null;
  lastMessageAt: string | null;
  lastMessagePreviewType: AdminChatConversationPreviewType;
  messagesCount: number;
  attachmentsCount: number;
  status: AdminChatConversationStatus;
  canSendMessage: boolean;
  closedBy: AdminChatConversationLockOwner | null;
  closedAt: string | null;
  closeReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminChatConversationListResponse = {
  items: AdminChatConversationListItem[];
  pagination: AdminChatConversationPagination;
};

export type AdminChatConversationLockState = {
  isActive: boolean;
  disabledAt: string | null;
  disabledByUserId: string | null;
  disabledReason: string | null;
  enabledAt: string | null;
  enabledByUserId: string | null;
};

export type AdminChatConversationModerationState = {
  status: AdminChatConversationStatus;
  closedBy: AdminChatConversationLockOwner | null;
  closedAt: string | null;
  closeReason: string | null;
};

export type AdminChatConversationUserSummary = {
  id: string;
  displayName: string | null;
  email: string | null;
};

export type AdminChatConversationSessionSummary = {
  sessionId: string;
  sessionCode: string;
  sessionDateTime: string | null;
  status: string;
};

export type AdminChatConversationDetailItem = {
  conversationId: string;
  conversationStatus: string;
  status: AdminChatConversationStatus;
  canSendMessage: boolean;
  messagesCount: number;
  attachmentsCount: number;
  patient: AdminChatConversationUserSummary;
  practitioner: AdminChatConversationUserSummary;
  session: AdminChatConversationSessionSummary;
  moderationState: AdminChatConversationModerationState;
  adminLockState: AdminChatConversationLockState;
  practitionerLockState: AdminChatConversationLockState;
  lastMessageAt: string | null;
  lastMessagePreviewType: AdminChatConversationPreviewType;
  createdAt: string;
  updatedAt: string;
};

export type AdminChatConversationDetailResponse = {
  item: AdminChatConversationDetailItem;
};

export type AdminChatConversationMessage = {
  messageId: string;
  senderRole: AdminChatConversationSenderRole;
  senderName: string | null;
  sentAt: string;
  body: string;
  attachments: AdminChatConversationAttachment[];
  deletedAt: string | null;
  editedAt: string | null;
};

export type AdminChatConversationMessagesResponse = {
  items: AdminChatConversationMessage[];
  pagination: AdminChatConversationPagination;
};

export type AdminChatConversationDisableInput = {
  reason: string;
  note?: string;
};

export type AdminChatConversationEnableInput = {
  note?: string;
};
