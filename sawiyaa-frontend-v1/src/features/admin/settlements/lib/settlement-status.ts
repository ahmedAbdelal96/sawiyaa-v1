import type { SettlementStatus } from "../types/admin-settlements.types";
export const SETTLEMENT_STATUS_STYLES: Record<string, string> = {
  UNDER_REVIEW: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200",
  APPROVED: "bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200",
  REJECTED: "bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200",
  CREDITED: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200",
  PAID_OUT: "bg-primary-light text-primary dark:bg-primary/10 dark:text-primary-light",
  DRAFT: "bg-surface-tertiary text-text-secondary",
};
export function canEditSettlement(status: SettlementStatus) { return status === "UNDER_REVIEW" || status === "DRAFT"; }
