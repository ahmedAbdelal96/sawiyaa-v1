import type {
  AdminDeliveryAttemptStatus,
  AdminNotificationStatus,
} from "../types/admin-notifications.types";

export function getAdminNotificationStatusTone(status: AdminNotificationStatus) {
  switch (status) {
    case "PENDING":
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300";
    case "QUEUED":
      return "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light";
    case "FAILED":
      return "bg-error-50 text-error-700 dark:bg-error-500/12 dark:text-error-400";
    case "SUPPRESSED":
      return "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/70";
    case "CANCELLED":
      return "bg-surface-tertiary text-text-muted dark:bg-white/8 dark:text-white/60";
    case "SENT":
    case "DELIVERED":
    case "READ":
      return "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light";
    default:
      return "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/60";
  }
}

export function getDeliveryAttemptTone(status: AdminDeliveryAttemptStatus) {
  switch (status) {
    case "FAILED":
      return "text-error-600 dark:text-error-400";
    case "DELIVERED":
      return "text-text-brand dark:text-primary-light";
    case "SENT":
      return "text-text-brand dark:text-primary-light";
    default:
      return "text-warning-600 dark:text-warning-300";
  }
}
