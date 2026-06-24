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

export type ModerationCaseStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "READY_FOR_ENFORCEMENT"
  | "RESOLVED"
  | "DISMISSED";

export type ModerationReportItem = {
  id: string;
  targetType: ModerationReportTargetType;
  targetId: string;
  reason: ModerationReportReason;
  note: string | null;
  status: ModerationCaseStatus;
  createdAt: string;
};

export type CreateModerationReportInput = {
  targetType: ModerationReportTargetType;
  targetId: string;
  reason: ModerationReportReason;
  note?: string;
};

