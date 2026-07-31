export type ModerationCaseStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "READY_FOR_ENFORCEMENT"
  | "RESOLVED"
  | "DISMISSED";

export type ModerationReportTargetType =
  | "CARE_CHAT_CONVERSATION"
  | "CARE_CHAT_MESSAGE"
  | "GENERAL_CHAT_CONVERSATION"
  | "GENERAL_CHAT_MESSAGE"
  | "REVIEW"
  | "ARTICLE"
  | "SUPPORT_TICKET"
  | "SUPPORT_MESSAGE";

export type ModerationReportReason =
  | "ABUSE"
  | "HARASSMENT"
  | "SPAM"
  | "SCAM"
  | "INAPPROPRIATE_CONTENT"
  | "PRIVACY_BREACH"
  | "OTHER";

export type ModerationReporterRole =
  | "PATIENT"
  | "PRACTITIONER"
  | "SUPPORT_AGENT"
  | "ADMIN"
  | "CONTENT_REVIEWER";

export type ModerationCaseActionType =
  | "REVIEW_CASE"
  | "PREPARE_ENFORCEMENT"
  | "MARK_RESOLVED"
  | "DISMISS_CASE"
  | "ENFORCE_CARE_CHAT_REVOKE"
  | "ENFORCE_CARE_CHAT_MESSAGE_HIDE"
  | "ENFORCE_REVIEW_HIDE"
  | "ENFORCE_REVIEW_REJECT"
  | "ENFORCE_REVIEW_RESTORE"
  | "ENFORCE_ARTICLE_ARCHIVE"
  | "ENFORCE_SUPPORT_ESCALATE"
  | "ENFORCE_USER_WARNING"
  | "ENFORCE_USER_RESTRICTION"
  | "ENFORCE_USER_SUSPENSION";
  

export type ModerationReportsSortBy = "CREATED_AT";
export type ModerationReportsSortOrder = "ASC" | "DESC";

export type ModerationTargetSnapshot = {
  kind: string;
  context: Record<string, unknown>;
};

export interface ModerationQueueItem {
  id: string;
  targetType: ModerationReportTargetType;
  targetId: string;
  reason: ModerationReportReason;
  status: ModerationCaseStatus;
  reporterRole: ModerationReporterRole;
  lastActionAt: string | null;
  targetSnapshot: ModerationTargetSnapshot | null;
  createdAt: string;
}

export interface ModerationCaseDetail extends ModerationQueueItem {
  reporterUserId: string | null;
  note: string | null;
  reporter: {
    userId: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
    patientProfileId: string | null;
    practitionerProfileId: string | null;
  } | null;
  targetUser: ModerationCaseDetail["reporter"];
  investigation: {
    chatType: "SESSION_CHAT" | "CARE_CHAT" | "GENERAL_CHAT" | null;
    conversationId: string;
    reportedMessageId: string | null;
    conversation?: {
      name: string | null;
      type: string;
      sessionId: string | null;
      sessionCode: string | null;
      participants: Array<{
        userId: string;
        displayName: string | null;
        role: string;
      }>;
    } | null;
    messages?: Array<{
      id: string;
      senderUserId: string | null;
      senderName: string | null;
      senderRole: string;
      body: string;
      sentAt: string;
      attachments: Array<{ fileId: string; mimeType: string; originalName: string | null }>;
      isReported: boolean;
    }>;
  } | null;
  history: {
    reporterPreviousReports: ModerationHistoryItem[];
    targetPreviousReports: ModerationHistoryItem[];
    targetEnforcements: Array<{
      id: string;
      type: string;
      reason: string | null;
      note: string | null;
      createdAt: string;
    }>;
    actions: Array<{
      id: string;
      actionType: ModerationCaseActionType;
      previousStatus: ModerationCaseStatus;
      nextStatus: ModerationCaseStatus;
      reason: string | null;
      note: string | null;
      actedByUserId: string | null;
      createdAt: string;
    }>;
    auditEvents: Array<{
      id: string;
      eventType: string;
      actorUserId: string | null;
      actorRole: ModerationReporterRole;
      metadataJson: unknown;
      createdAt: string;
    }>;
  };
}

export interface ModerationHistoryItem {
  id: string;
  status: ModerationCaseStatus;
  reason: ModerationReportReason;
  targetType: ModerationReportTargetType;
  createdAt: string;
  lastActionAt: string | null;
}

export interface ModerationPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ModerationQueueFilters {
  sortBy: ModerationReportsSortBy;
  sortOrder: ModerationReportsSortOrder;
  status: ModerationCaseStatus | null;
  targetType: ModerationReportTargetType | null;
  reporterRole: ModerationReporterRole | null;
  reason: ModerationReportReason | null;
  createdFrom: string | null;
  createdTo: string | null;
  query: string | null;
}

export interface ModerationReportsListData {
  items: ModerationQueueItem[];
  pagination: ModerationPagination;
  filters: ModerationQueueFilters;
}

export interface ModerationReportDetailData {
  item: ModerationCaseDetail;
}

export interface ModerationActionExecution {
  actionId: string;
  action: ModerationCaseActionType;
  previousStatus: ModerationCaseStatus;
  nextStatus: ModerationCaseStatus;
  reason: string | null;
  note: string | null;
  createdAt: string;
}

export interface ModerationActionExecutionData {
  item: ModerationCaseDetail;
  actionExecution: ModerationActionExecution;
}

export interface ListModerationReportsParams {
  page?: number;
  limit?: number;
  status?: ModerationCaseStatus;
  targetType?: ModerationReportTargetType;
  reporterRole?: ModerationReporterRole;
  reason?: ModerationReportReason;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: ModerationReportsSortBy;
  sortOrder?: ModerationReportsSortOrder;
  query?: string;
}

export interface ExecuteModerationActionInput {
  action: ModerationCaseActionType;
  reason?: string;
  note?: string;
}
