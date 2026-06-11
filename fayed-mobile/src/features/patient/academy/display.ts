import type { AcademyCourseItem, AcademyEnrollmentItem } from "./types";

export function formatAcademyMoney(
  amount: string | null | undefined,
  currencyCode: string | null | undefined,
  locale: string,
) {
  if (!amount || !currencyCode) {
    return null;
  }

  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) {
    return `${amount} ${currencyCode.toUpperCase()}`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function isAcademyCourseFree(
  course: AcademyCourseItem | null | undefined,
) {
  if (!course) {
    return true;
  }

  if (!course.priceAmount) {
    return true;
  }

  const numeric = Number(course.priceAmount);
  return Number.isFinite(numeric) ? numeric <= 0 : false;
}

export function formatAcademyLectureDateRange(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
  locale: string,
) {
  if (!startAt && !endAt) {
    return "-";
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    hour12: !locale.startsWith("ar"),
  });

  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });

  const dateSource = startAt ?? endAt;
  const dateLabel = dateSource ? formatter.format(new Date(dateSource)) : "-";
  const startLabel = startAt ? timeFormatter.format(new Date(startAt)) : "-";
  const endLabel = endAt ? timeFormatter.format(new Date(endAt)) : "-";

  return `${dateLabel} · ${startLabel} - ${endLabel}`;
}

export function getAcademyEnrollmentStatusTranslationKey(
  status: AcademyEnrollmentItem["enrollmentStatus"],
) {
  switch (status) {
    case "PENDING_PAYMENT":
      return "academy.enrollment.statuses.PENDING_PAYMENT";
    case "PAID":
      return "academy.enrollment.statuses.PAID";
    case "CONFIRMED":
      return "academy.enrollment.statuses.CONFIRMED";
    case "PAYMENT_FAILED":
      return "academy.enrollment.statuses.PAYMENT_FAILED";
    case "CANCELLED":
      return "academy.enrollment.statuses.CANCELLED";
    case "REFUNDED":
      return "academy.enrollment.statuses.REFUNDED";
    default:
      return "academy.enrollment.statuses.UNKNOWN";
  }
}

export function getAcademyEnrollmentStatusTone(
  status: AcademyEnrollmentItem["enrollmentStatus"],
) {
  switch (status) {
    case "PAID":
    case "CONFIRMED":
      return "success" as const;
    case "PENDING_PAYMENT":
      return "warning" as const;
    case "PAYMENT_FAILED":
      return "error" as const;
    case "CANCELLED":
    case "REFUNDED":
      return "default" as const;
    default:
      return "info" as const;
  }
}

export function getAcademyPaymentStatusTranslationKey(
  status: AcademyEnrollmentItem["paymentStatus"],
) {
  switch (status) {
    case "CREATED":
      return "academy.enrollment.paymentStatuses.CREATED";
    case "PENDING":
      return "academy.enrollment.paymentStatuses.PENDING";
    case "REQUIRES_ACTION":
      return "academy.enrollment.paymentStatuses.REQUIRES_ACTION";
    case "AUTHORIZED":
      return "academy.enrollment.paymentStatuses.AUTHORIZED";
    case "CAPTURED":
      return "academy.enrollment.paymentStatuses.CAPTURED";
    case "FAILED":
      return "academy.enrollment.paymentStatuses.FAILED";
    case "CANCELLED":
      return "academy.enrollment.paymentStatuses.CANCELLED";
    case "EXPIRED":
      return "academy.enrollment.paymentStatuses.EXPIRED";
    default:
      return "academy.enrollment.paymentStatuses.UNKNOWN";
  }
}

export function getAcademyAccessLockedReasonTranslationKey(
  reason: AcademyEnrollmentItem["joinAccess"]["accessLockedReason"],
) {
  switch (reason) {
    case "PAYMENT_PENDING":
      return "academy.enrollment.accessLockedReasons.PAYMENT_PENDING";
    case "PAYMENT_FAILED":
      return "academy.enrollment.accessLockedReasons.PAYMENT_FAILED";
    case "ENROLLMENT_CANCELLED":
      return "academy.enrollment.accessLockedReasons.ENROLLMENT_CANCELLED";
    case "ENROLLMENT_REFUNDED":
      return "academy.enrollment.accessLockedReasons.ENROLLMENT_REFUNDED";
    case "ACCESS_NOT_AVAILABLE":
      return "academy.enrollment.accessLockedReasons.ACCESS_NOT_AVAILABLE";
    default:
      return "academy.enrollment.accessLockedReasons.DEFAULT";
  }
}
