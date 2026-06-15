import type { AdminSessionInspectorRecommendedOutcome } from "../types/admin-session-runtime.types";

export type OutcomeTone = "positive" | "warning" | "technical" | "neutral";

export const OUTCOME_TONE: Record<AdminSessionInspectorRecommendedOutcome, OutcomeTone> = {
  COMPLETION_CANDIDATE: "positive",
  PATIENT_NO_SHOW_CANDIDATE: "warning",
  PRACTITIONER_NO_SHOW_CANDIDATE: "warning",
  BOTH_NO_SHOW_CANDIDATE: "warning",
  TECHNICAL_REVIEW_CANDIDATE: "technical",
  INSUFFICIENT_EVIDENCE: "neutral",
  MANUAL_REVIEW_REQUIRED: "neutral",
};

export const OUTCOME_TONE_CLASS: Record<OutcomeTone, string> = {
  positive:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  technical:
    "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  neutral:
    "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/70",
};

export const SOURCE_CONFIDENCE_TONE: Record<"HIGH" | "MEDIUM" | "LOW", string> = {
  HIGH: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  LOW: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

/**
 * Format an ISO date string for the admin inspector surfaces.
 * Always returns a localized display string, or "-" for null/invalid values.
 */
export function formatInspectorDateTime(
  value: string | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  },
): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", options);
}

export function formatDurationSeconds(
  totalSeconds: number,
  locale: string,
): { value: string; unit: string } {
  if (totalSeconds < 60) {
    return { value: String(totalSeconds), unit: locale === "ar" ? "ثانية" : "s" };
  }
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return { value: String(minutes), unit: locale === "ar" ? "دقيقة" : "min" };
  }
  const hours = Math.floor(minutes / 60);
  const rem = minutes - hours * 60;
  if (rem === 0) {
    return { value: String(hours), unit: locale === "ar" ? "ساعة" : "h" };
  }
  return {
    value: `${hours}:${String(rem).padStart(2, "0")}`,
    unit: locale === "ar" ? "س:د" : "h:m",
  };
}
