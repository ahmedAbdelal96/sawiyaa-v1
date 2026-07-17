import { toAppError } from "@/lib/api/errors";
import type {
  SessionEarningReviewDecision,
  SessionEarningReviewStatus,
  SessionEarningReviewSourceType,
} from "../types/admin-session-earning-reviews.types";

export const ADMIN_SESSION_EARNING_REVIEW_STATUS_STYLES: Record<
  SessionEarningReviewStatus,
  string
> = {
  PENDING_REVIEW: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  REJECTED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  EXCLUDED_FROM_PAYOUT:
    "bg-surface-tertiary text-text-secondary dark:bg-white/8 dark:text-white/65",
};

export const ADMIN_SESSION_EARNING_REVIEW_DECISION_STYLES: Record<
  SessionEarningReviewDecision,
  string
> = {
  AUTO_CREATED: "bg-surface-tertiary text-text-secondary dark:bg-white/8 dark:text-white/65",
  APPROVED_AS_IS: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  EDITED_AND_APPROVED: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  REJECTED_PAYOUT: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  EXCLUDED_FROM_PAYOUT: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
};

export const ADMIN_SESSION_EARNING_REVIEW_SOURCE_TYPE_STYLES: Record<
  SessionEarningReviewSourceType,
  string
> = {
  DIRECT_SESSION: "bg-primary-light/40 text-primary dark:bg-primary/10",
  PACKAGE_SESSION: "bg-surface-tertiary text-text-secondary dark:bg-white/8 dark:text-white/65",
};

export function getAdminSessionEarningReviewErrorKey(error: unknown) {
  const appError = toAppError(error);

  switch (appError.code) {
    case "FINANCIAL_OPERATIONS_SESSION_EARNING_REVIEW_NOT_FOUND":
      return "errors.notFound";
    case "FINANCIAL_OPERATIONS_SESSION_EARNING_REVIEW_FINAL_AMOUNTS_REQUIRED":
      return "errors.finalAmountsRequired";
    case "FINANCIAL_OPERATIONS_SESSION_EARNING_REVIEW_REASON_REQUIRED":
      return "errors.reasonRequired";
    case "STEP_UP_REQUIRED":
      return "errors.stepUpRequired";
    default:
      if (appError.statusCode === 403) {
        return "errors.forbidden";
      }
      if (appError.statusCode === 404) {
        return "errors.notFound";
      }
      return "errors.generic";
  }
}

export function getAdminSessionEarningReviewStatusKey(status: SessionEarningReviewStatus) {
  switch (status) {
    case "PENDING_REVIEW":
      return "statuses.pendingReview";
    case "APPROVED":
      return "statuses.approved";
    case "REJECTED":
      return "statuses.rejected";
    case "EXCLUDED_FROM_PAYOUT":
      return "statuses.excludedFromPayout";
  }
}

export function getAdminSessionEarningReviewDecisionKey(decision: SessionEarningReviewDecision) {
  switch (decision) {
    case "AUTO_CREATED":
      return "decisions.autoCreated";
    case "APPROVED_AS_IS":
      return "decisions.approveAsIs";
    case "EDITED_AND_APPROVED":
      return "decisions.editAndApprove";
    case "REJECTED_PAYOUT":
      return "decisions.rejectPayout";
    case "EXCLUDED_FROM_PAYOUT":
      return "decisions.excludeFromPayout";
  }
}

export function getAdminSessionEarningReviewSourceTypeKey(sourceType: SessionEarningReviewSourceType) {
  switch (sourceType) {
    case "DIRECT_SESSION":
      return "sourceTypes.directSession";
    case "PACKAGE_SESSION":
      return "sourceTypes.packageSession";
  }
}
