import { toAppError } from "@/lib/api/errors";
import type {
  ModerationCaseActionType,
  ModerationCaseStatus,
  ModerationReportTargetType,
} from "../types/admin-moderation-reports.types";

export const ADMIN_MODERATION_STATUS_STYLES: Record<ModerationCaseStatus, string> = {
  OPEN: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70",
  UNDER_REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  READY_FOR_ENFORCEMENT:
    "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light",
  RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  DISMISSED: "bg-zinc-100 text-zinc-700 dark:bg-white/8 dark:text-white/60",
};

export const MODERATION_ACTIONS_BY_STATUS: Record<
  ModerationCaseStatus,
  ModerationCaseActionType[]
> = {
  OPEN: ["REVIEW_CASE", "DISMISS_CASE"],
  UNDER_REVIEW: ["PREPARE_ENFORCEMENT", "MARK_RESOLVED", "DISMISS_CASE"],
  READY_FOR_ENFORCEMENT: [
    "MARK_RESOLVED",
    "DISMISS_CASE",
    "ENFORCE_CARE_CHAT_REVOKE",
    "ENFORCE_CARE_CHAT_MESSAGE_HIDE",
    "ENFORCE_REVIEW_HIDE",
    "ENFORCE_REVIEW_REJECT",
    "ENFORCE_REVIEW_RESTORE",
    "ENFORCE_ARTICLE_ARCHIVE",
    "ENFORCE_SUPPORT_ESCALATE",
  ],
  RESOLVED: [],
  DISMISSED: [],
};

export const MODERATION_ACTIONS_REQUIRE_REASON: ModerationCaseActionType[] = [
  "PREPARE_ENFORCEMENT",
  "DISMISS_CASE",
  "ENFORCE_CARE_CHAT_REVOKE",
  "ENFORCE_CARE_CHAT_MESSAGE_HIDE",
  "ENFORCE_REVIEW_HIDE",
  "ENFORCE_REVIEW_REJECT",
  "ENFORCE_REVIEW_RESTORE",
  "ENFORCE_ARTICLE_ARCHIVE",
  "ENFORCE_SUPPORT_ESCALATE",
];

const ACTION_TARGET_MATRIX: Partial<
  Record<ModerationCaseActionType, ModerationReportTargetType[]>
> = {
  PREPARE_ENFORCEMENT: [
    "CARE_CHAT_CONVERSATION",
    "CARE_CHAT_MESSAGE",
    "REVIEW",
    "ARTICLE",
    "SUPPORT_TICKET",
    "SUPPORT_MESSAGE",
  ],
  ENFORCE_CARE_CHAT_REVOKE: ["CARE_CHAT_CONVERSATION", "CARE_CHAT_MESSAGE"],
  ENFORCE_CARE_CHAT_MESSAGE_HIDE: ["CARE_CHAT_MESSAGE"],
  ENFORCE_REVIEW_HIDE: ["REVIEW"],
  ENFORCE_REVIEW_REJECT: ["REVIEW"],
  ENFORCE_REVIEW_RESTORE: ["REVIEW"],
  ENFORCE_ARTICLE_ARCHIVE: ["ARTICLE"],
  ENFORCE_SUPPORT_ESCALATE: ["SUPPORT_TICKET", "SUPPORT_MESSAGE"],
};

const ROLE_ACTION_MATRIX: Record<string, ModerationCaseActionType[]> = {
  ADMIN: [
    "REVIEW_CASE",
    "PREPARE_ENFORCEMENT",
    "MARK_RESOLVED",
    "DISMISS_CASE",
    "ENFORCE_CARE_CHAT_REVOKE",
    "ENFORCE_CARE_CHAT_MESSAGE_HIDE",
    "ENFORCE_REVIEW_HIDE",
    "ENFORCE_REVIEW_REJECT",
    "ENFORCE_REVIEW_RESTORE",
    "ENFORCE_ARTICLE_ARCHIVE",
    "ENFORCE_SUPPORT_ESCALATE",
  ],
  SUPER_ADMIN: [
    "REVIEW_CASE",
    "PREPARE_ENFORCEMENT",
    "MARK_RESOLVED",
    "DISMISS_CASE",
    "ENFORCE_CARE_CHAT_REVOKE",
    "ENFORCE_CARE_CHAT_MESSAGE_HIDE",
    "ENFORCE_REVIEW_HIDE",
    "ENFORCE_REVIEW_REJECT",
    "ENFORCE_REVIEW_RESTORE",
    "ENFORCE_ARTICLE_ARCHIVE",
    "ENFORCE_SUPPORT_ESCALATE",
  ],
  SUPPORT_AGENT: [
    "REVIEW_CASE",
    "MARK_RESOLVED",
    "DISMISS_CASE",
    "ENFORCE_CARE_CHAT_REVOKE",
    "ENFORCE_CARE_CHAT_MESSAGE_HIDE",
    "ENFORCE_REVIEW_HIDE",
    "ENFORCE_SUPPORT_ESCALATE",
  ],
  CONTENT_REVIEWER: [
    "REVIEW_CASE",
    "PREPARE_ENFORCEMENT",
    "DISMISS_CASE",
    "ENFORCE_CARE_CHAT_MESSAGE_HIDE",
    "ENFORCE_REVIEW_HIDE",
    "ENFORCE_REVIEW_REJECT",
    "ENFORCE_REVIEW_RESTORE",
    "ENFORCE_ARTICLE_ARCHIVE",
  ],
};

export function getAllowedModerationActions(input: {
  status: ModerationCaseStatus;
  targetType: ModerationReportTargetType;
  role?: string | null;
}) {
  const base = MODERATION_ACTIONS_BY_STATUS[input.status] ?? [];
  const roleAllowed = input.role ? ROLE_ACTION_MATRIX[input.role] ?? [] : [];

  return base.filter((action) => {
    if (input.role && roleAllowed.length > 0 && !roleAllowed.includes(action)) {
      return false;
    }

    const allowedTargets = ACTION_TARGET_MATRIX[action];
    if (!allowedTargets) {
      return true;
    }
    return allowedTargets.includes(input.targetType);
  });
}

export function doesActionRequireReason(action: ModerationCaseActionType) {
  return MODERATION_ACTIONS_REQUIRE_REASON.includes(action);
}

export function getAdminModerationErrorKey(error: unknown) {
  const appError = toAppError(error);

  switch (appError.code) {
    case "MODERATION_REPORTS_INVALID_FILTER":
      return "errors.invalidFilters";
    case "MODERATION_REPORTS_FORBIDDEN_SCOPE":
      return "errors.forbiddenScope";
    case "MODERATION_REPORT_NOT_FOUND_IN_SCOPE":
      return "errors.reportNotFound";
    case "MODERATION_CASE_NOT_FOUND":
      return "errors.caseNotFound";
    case "MODERATION_ACTION_NOT_ALLOWED_FOR_ROLE":
      return "errors.actionNotAllowed";
    case "MODERATION_ACTION_REASON_REQUIRED":
      return "errors.reasonRequired";
    case "MODERATION_INVALID_ACTION_TARGET_COMBINATION":
      return "errors.invalidActionTarget";
    case "MODERATION_INVALID_CASE_TRANSITION":
      return "errors.invalidTransition";
    case "MODERATION_CASE_TRANSITION_RACE_CONDITION":
      return "errors.raceCondition";
    case "MODERATION_ENFORCEMENT_TARGET_REFERENCE_NOT_FOUND":
      return "errors.enforcementTargetNotFound";
    default:
      return "errors.generic";
  }
}
