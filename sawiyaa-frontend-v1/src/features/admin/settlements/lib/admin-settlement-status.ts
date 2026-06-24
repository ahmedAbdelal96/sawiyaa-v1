import { toAppError } from "@/lib/api/errors";
import type {
  PractitionerSettlementStatus,
  SettlementBatchStatus,
} from "../types/admin-settlements.types";

export const ADMIN_SETTLEMENT_BATCH_STATUS_STYLES: Record<
  SettlementBatchStatus,
  string
> = {
  DRAFT: "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/70",
  GENERATED: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  FINALIZED: "bg-surface-tertiary text-text-primary dark:bg-surface-tertiary dark:text-text-primary",
  PROCESSING: "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  FAILED: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
  CANCELLED: "bg-surface-tertiary text-text-secondary dark:bg-white/8 dark:text-white/60",
};

export const ADMIN_SETTLEMENT_ITEM_STATUS_STYLES: Record<
  PractitionerSettlementStatus,
  string
> = {
  DRAFT: "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/70",
  READY: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  PROCESSING: "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  FAILED: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
  CANCELLED: "bg-surface-tertiary text-text-secondary dark:bg-white/8 dark:text-white/60",
};

export function getAdminSettlementErrorKey(error: unknown) {
  const appError = toAppError(error);

  switch (appError.code) {
    case "FINANCIAL_OPERATIONS_SETTLEMENT_BATCH_EXISTS":
      return "errors.batchExists";
    case "FINANCIAL_OPERATIONS_SETTLEMENT_BATCH_NOT_FOUND":
      return "errors.batchNotFound";
    case "FINANCIAL_OPERATIONS_INVALID_SETTLEMENT_STATE":
      return "errors.invalidState";
    case "FINANCIAL_OPS_INVALID_FILTER":
      return "errors.invalidFilters";
    case "FINANCIAL_OPS_FORBIDDEN_SCOPE":
      return "errors.forbiddenScope";
    case "FINANCIAL_OPS_RESOURCE_NOT_FOUND_IN_SCOPE":
      return "errors.notFound";
    default:
      return "errors.generic";
  }
}

export function canMarkSettlementPaid(status: SettlementBatchStatus) {
  return ["GENERATED", "FINALIZED", "PROCESSING"].includes(status);
}

export function canMarkSettlementFailed(status: SettlementBatchStatus) {
  return ["GENERATED", "FINALIZED", "PROCESSING"].includes(status);
}
