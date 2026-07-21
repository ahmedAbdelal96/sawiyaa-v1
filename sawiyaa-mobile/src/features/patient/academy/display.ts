import type { AcademyProgramEnrollmentItem } from "./types";
import { formatViewerDate, formatViewerTime } from "../../../lib/time-formatting";
import { formatMoney, parseAcademyPrice } from "../../../lib/money";

export function formatAcademyMoney(amount: string | null | undefined, currencyCode: string | null | undefined, locale: string) {
  const money = parseAcademyPrice({ priceStatus: "PAID", priceAmount: amount, currencyCode }).money;
  return money ? formatMoney(money, locale) : null;
}

export function academyPriceOf(input: { priceStatus?: string | null; pricingStatus?: string | null; priceAmount?: string | null; currencyCode?: string | null }) {
  return parseAcademyPrice(input);
}

export function formatAcademySessionDateRange(startAt: string | null | undefined, endAt: string | null | undefined, locale: string) {
  if (!startAt && !endAt) return "-";
  const dateSource = startAt ?? endAt;
  const dateLabel = dateSource ? formatViewerDate(dateSource, { locale }) : "-";
  const startLabel = startAt ? formatViewerTime(startAt, { locale }) : "-";
  const endLabel = endAt ? formatViewerTime(endAt, { locale }) : "-";
  return `${dateLabel} · ${startLabel} - ${endLabel}`;
}

export function getAcademyEnrollmentStatusTranslationKey(status: AcademyProgramEnrollmentItem["status"]) {
  switch (status) {
    case "PENDING_PAYMENT": return "academy.enrollment.statuses.PENDING_PAYMENT";
    case "CONFIRMED": return "academy.enrollment.statuses.CONFIRMED";
    case "CANCELLED": return "academy.enrollment.statuses.CANCELLED";
    case "EXPIRED": return "academy.enrollment.statuses.EXPIRED";
    default: return "academy.enrollment.statuses.UNKNOWN";
  }
}

export function getAcademyEnrollmentStatusTone(status: AcademyProgramEnrollmentItem["status"]) {
  switch (status) {
    case "CONFIRMED": return "success" as const;
    case "PENDING_PAYMENT": return "warning" as const;
    case "EXPIRED": return "error" as const;
    case "CANCELLED": return "default" as const;
    default: return "info" as const;
  }
}

export function getAcademyPaymentStatusTranslationKey(status: AcademyProgramEnrollmentItem["paymentStatus"]) {
  switch (status) {
    case "CREATED": return "academy.enrollment.paymentStatuses.CREATED";
    case "PENDING": return "academy.enrollment.paymentStatuses.PENDING";
    case "REQUIRES_ACTION": return "academy.enrollment.paymentStatuses.REQUIRES_ACTION";
    case "AUTHORIZED": return "academy.enrollment.paymentStatuses.AUTHORIZED";
    case "CAPTURED": return "academy.enrollment.paymentStatuses.CAPTURED";
    case "FAILED": return "academy.enrollment.paymentStatuses.FAILED";
    case "CANCELLED": return "academy.enrollment.paymentStatuses.CANCELLED";
    case "EXPIRED": return "academy.enrollment.paymentStatuses.EXPIRED";
    default: return "academy.enrollment.paymentStatuses.UNKNOWN";
  }
}

export function getAcademyAccessLockedReasonTranslationKey(reason: AcademyProgramEnrollmentItem["joinAccess"]["accessLockedReason"]) {
  switch (reason) {
    case "PAYMENT_PENDING": return "academy.enrollment.accessLockedReasons.PAYMENT_PENDING";
    case "PAYMENT_FAILED": return "academy.enrollment.accessLockedReasons.PAYMENT_FAILED";
    case "ENROLLMENT_CANCELLED": return "academy.enrollment.accessLockedReasons.ENROLLMENT_CANCELLED";
    case "ACCESS_NOT_AVAILABLE": return "academy.enrollment.accessLockedReasons.ACCESS_NOT_AVAILABLE";
    default: return "academy.enrollment.accessLockedReasons.DEFAULT";
  }
}
