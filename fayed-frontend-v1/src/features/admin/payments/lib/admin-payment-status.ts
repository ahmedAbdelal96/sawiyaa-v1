import { toAppError } from "@/lib/api/errors";
import type { PaymentStatus } from "@/features/payments/types/payments.types";
import type { AdminRefundStatus } from "../types/admin-payments.types";

export const ADMIN_PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  CREATED:
    "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/60",
  PENDING: "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  REQUIRES_ACTION:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  AUTHORIZED: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  CAPTURED: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  FAILED: "bg-error-50 text-error-700 dark:bg-error-500/12 dark:text-error-400",
  CANCELLED:
    "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/50",
  EXPIRED:
    "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/50",
  REFUND_PENDING:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  PARTIALLY_REFUNDED:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  REFUNDED:
    "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/60",
};

export const ADMIN_REFUND_STATUS_STYLES: Record<AdminRefundStatus, string> = {
  REQUESTED: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  PROCESSING: "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  SUCCEEDED: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  FAILED: "bg-error-50 text-error-700 dark:bg-error-500/12 dark:text-error-400",
  CANCELLED:
    "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/50",
};

export function getAdminPaymentErrorKey(error: unknown) {
  const appError = toAppError(error);

  switch (appError.code) {
    case "PAYMENT_NOT_REFUNDABLE":
      return "payments.errors.notRefundable";
    case "PAYMENT_REFUND_ALREADY_IN_PROGRESS":
      return "payments.errors.refundInProgress";
    case "PAYMENT_ALREADY_FULLY_REFUNDED":
      return "payments.errors.alreadyRefunded";
    case "PAYMENT_INVALID_REFUND_AMOUNT":
      return "payments.errors.invalidRefundAmount";
    case "PAYMENT_REFUND_AMOUNT_EXCEEDS_REMAINING":
      return "payments.errors.refundAmountExceedsRemaining";
    case "PAYMENT_REFUND_NOT_RETRYABLE":
      return "payments.errors.refundNotRetryable";
    case "PAYMENT_REFUND_NOT_FOUND":
      return "payments.errors.refundNotFound";
    default:
      return "payments.errors.generic";
  }
}
