import { API_CONFIG } from "@/lib/api/config";
import type {
  EnrollmentAttendanceStatus,
  EnrollmentStatus,
  PaymentStatus,
  PublicTrainingListItem,
  TrainingEnrollmentAvailabilityReason,
  TrainingJoinBlockedReason,
  TrainingSchedule,
  TrainingScheduleStatus,
} from "../types/training.types";

export function formatTrainingDatetime(
  isoString: string | null,
  locale: string,
): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: locale !== "ar",
  });
}

export function formatTrainingAmount(
  amount: string,
  currency: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(Number(amount));
}

export function getOpenSchedulesCount(
  training: { schedules?: Array<{ isEnrollmentOpen: boolean }> },
) {
  return training.schedules?.filter((schedule) => schedule.isEnrollmentOpen).length ?? 0;
}

export function getTrainingAvailabilityKey(
  reason: TrainingEnrollmentAvailabilityReason,
): TrainingEnrollmentAvailabilityReason {
  return reason;
}

export function getTrainingJoinBlockedReasonKey(
  reason: TrainingJoinBlockedReason | null,
): TrainingJoinBlockedReason | "UNKNOWN" {
  return reason ?? "UNKNOWN";
}

export function getEnrollmentStatusTone(status: EnrollmentStatus) {
  if (status === "ACTIVE") return "emerald";
  if (status === "PENDING_PAYMENT") return "amber";
  if (status === "COMPLETED") return "sky";
  if (status === "CANCELLED" || status === "REFUNDED" || status === "NO_SHOW") {
    return "slate";
  }
  return "slate";
}

export function getAttendanceStatusTone(status: EnrollmentAttendanceStatus) {
  if (status === "ATTENDED") return "emerald";
  if (status === "NO_SHOW") return "amber";
  return "slate";
}

export function getScheduleStatusTone(status: TrainingScheduleStatus) {
  if (status === "DRAFT") return "slate";
  if (status === "OPEN_FOR_ENROLLMENT") return "emerald";
  if (status === "FULL") return "amber";
  if (status === "STARTED") return "sky";
  if (status === "ARCHIVED") return "slate";
  return "slate";
}

export function getPaymentStatusTone(status: PaymentStatus) {
  if (status === "CAPTURED" || status === "AUTHORIZED") return "emerald";
  if (status === "PENDING" || status === "REQUIRES_ACTION") return "amber";
  if (status === "FAILED" || status === "EXPIRED" || status === "CANCELLED") {
    return "rose";
  }
  return "slate";
}

export function getStatusToneClasses(
  tone: "emerald" | "amber" | "sky" | "rose" | "slate",
) {
  if (tone === "emerald") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
  }
  if (tone === "amber") {
    return "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300";
  }
  if (tone === "sky") {
    return "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light";
  }
  if (tone === "rose") {
    return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
  }
  return "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/70";
}

export function getTrainingCardSummary(
  training: PublicTrainingListItem,
  locale: string,
) {
  const published =
    training.publishedAt !== null
      ? new Date(training.publishedAt).toLocaleDateString(
          locale === "ar" ? "ar-SA" : "en-US",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
          },
        )
      : null;

  return {
    published,
    description: training.shortDescription?.trim() || null,
  };
}

export function buildTrainingPaymentReturnUrl(input: {
  locale: string;
  enrollmentId: string;
  origin: string;
}): string {
  const normalizedOrigin = input.origin.replace(/\/$/, "");
  return `${normalizedOrigin}/${input.locale}/patient/training/${input.enrollmentId}/payment-return`;
}

export function buildTrainingPaymentRedirectUrl(input: {
  enrollmentId: string;
  returnUrl: string;
}): string {
  const encodedReturnUrl = encodeURIComponent(input.returnUrl);
  const relativePath = `/patients/me/training/enrollments/${encodeURIComponent(input.enrollmentId)}/pay/redirect?returnUrl=${encodedReturnUrl}`;
  const apiBaseUrl = API_CONFIG.baseURL.replace(/\/$/, "");

  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return new URL(relativePath, `${apiBaseUrl}/`).toString();
  }

  return `${apiBaseUrl}${relativePath}`;
}
