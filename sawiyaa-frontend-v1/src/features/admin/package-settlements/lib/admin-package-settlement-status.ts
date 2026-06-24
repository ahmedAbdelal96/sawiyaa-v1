import { toAppError } from "@/lib/api/errors";
import type { PackageSettlementStatus } from "../types/admin-package-settlements.types";

export const ADMIN_PACKAGE_SETTLEMENT_STATUS_STYLES: Record<
  PackageSettlementStatus,
  string
> = {
  HELD: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  READY_TO_RELEASE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  PARTIALLY_RELEASED:
    "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  RELEASED: "bg-surface-tertiary text-text-primary dark:bg-white/10 dark:text-white/80",
  NEEDS_REVIEW: "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  REFUNDED_OR_ADJUSTED:
    "bg-surface-tertiary text-text-secondary dark:bg-white/8 dark:text-white/65",
};

export function canReleasePackageSettlement(status: PackageSettlementStatus) {
  return status === "READY_TO_RELEASE";
}

export function canReviewPackageSettlement(status: PackageSettlementStatus) {
  return status === "NEEDS_REVIEW";
}

export function getAdminPackageSettlementErrorKey(error: unknown) {
  const appError = toAppError(error);

  switch (appError.code) {
    case "FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_NOT_FOUND":
      return "errors.notFound";
    case "FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_NOT_READY":
      return "errors.notReady";
    case "FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_EMPTY":
      return "errors.empty";
    case "FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_INVALID_AMOUNT":
      return "errors.invalidAmount";
    case "FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_CURRENCY_MISSING":
      return "errors.currencyMissing";
    case "FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_SNAPSHOT_MISSING":
      return "errors.snapshotMissing";
    default:
      return "errors.generic";
  }
}

export function getPackageSettlementDecisionKey(decision: string | null) {
  switch (decision) {
    case "FULL_COMPLETION_ADMIN_RELEASE":
      return "decisions.fullCompletionAdminRelease";
    case "LEGACY_PACKAGE_EARNINGS_ALREADY_POSTED":
      return "decisions.legacyPackageEarningsAlreadyPosted";
    default:
      return "decisions.manualReview";
  }
}
