import { toAppError } from "@/lib/api/errors";
import type { PractitionerRecoveryReasonCode, PractitionerRecoveryStatus } from "../types/admin-practitioner-recoveries.types";

export const ADMIN_PRACTITIONER_RECOVERY_STATUS_STYLES: Record<PractitionerRecoveryStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  PARTIALLY_RECOVERED:
    "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  RECOVERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  WAIVED: "bg-surface-tertiary text-text-secondary dark:bg-white/8 dark:text-white/70",
};

export function getAdminPractitionerRecoveryStatusKey(status: PractitionerRecoveryStatus) {
  switch (status) {
    case "OPEN":
      return "practitionerRecoveries.statuses.open";
    case "PARTIALLY_RECOVERED":
      return "practitionerRecoveries.statuses.partiallyRecovered";
    case "RECOVERED":
      return "practitionerRecoveries.statuses.recovered";
    case "WAIVED":
      return "practitionerRecoveries.statuses.waived";
    default:
      return "practitionerRecoveries.statuses.open";
  }
}

export function getAdminPractitionerRecoveryReasonCodeKey(reasonCode: PractitionerRecoveryReasonCode) {
  switch (reasonCode) {
    case "REFUND_AFTER_PAYOUT":
      return "practitionerRecoveries.reasonCodes.refundAfterPayout";
    case "REFUND_AFTER_APPROVAL":
      return "practitionerRecoveries.reasonCodes.refundAfterApproval";
    case "MANUAL_FINANCE_CORRECTION":
      return "practitionerRecoveries.reasonCodes.manualFinanceCorrection";
    case "ADMIN_EXCEPTION":
      return "practitionerRecoveries.reasonCodes.adminException";
    default:
      return "practitionerRecoveries.reasonCodes.manualFinanceCorrection";
  }
}

export function getAdminPractitionerRecoveryActionKey(actionType: string) {
  switch (actionType) {
    case "APPLIED_TO_PAYOUT":
      return "practitionerRecoveries.actions.appliedToPayout";
    case "MANUALLY_COLLECTED":
      return "practitionerRecoveries.actions.manuallyCollected";
    case "WAIVED":
      return "practitionerRecoveries.actions.waived";
    default:
      return "practitionerRecoveries.actions.unknown";
  }
}

export function getAdminPractitionerRecoveryErrorKey(error: unknown) {
  const appError = toAppError(error);

  switch (appError.code) {
    case "FINANCIAL_OPERATIONS_RECOVERY_NOT_FOUND":
      return "errors.notFound";
    case "FINANCIAL_OPERATIONS_RECOVERY_AMOUNT_INVALID":
      return "errors.amountInvalid";
    case "FINANCIAL_OPERATIONS_RECOVERY_AMOUNT_EXCEEDS_REMAINING":
      return "errors.amountExceedsRemaining";
    case "FINANCIAL_OPERATIONS_RECOVERY_ALREADY_RESOLVED":
      return "errors.alreadyResolved";
    case "FINANCIAL_OPERATIONS_RECOVERY_REASON_REQUIRED":
      return "errors.reasonRequired";
    default:
      return "errors.generic";
  }
}
