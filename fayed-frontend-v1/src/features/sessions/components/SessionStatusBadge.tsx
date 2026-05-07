import { useTranslations } from "next-intl";
import type { SessionStatus } from "../types/sessions.types";

type Props = {
  status: SessionStatus;
  labelOverride?: string;
};

const STATUS_STYLES: Record<SessionStatus, string> = {
  DRAFT: "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/50",
  PENDING_PAYMENT:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  PENDING_PRACTITIONER_RESPONSE:
    "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  CONFIRMED: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  UPCOMING: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  READY_TO_JOIN:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  IN_PROGRESS:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED:
    "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/60",
  CANCELLED: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
  NO_SHOW: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
  EXPIRED:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  REFUND_PENDING:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  REFUNDED:
    "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/60",
};

export default function SessionStatusBadge({ status, labelOverride }: Props) {
  const t = useTranslations("sessions");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? "bg-surface-tertiary text-text-muted"}`}
    >
      {labelOverride ?? t(`status.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}
