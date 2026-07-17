import type { PatientPackagePurchaseItem } from "../types";
import {
  formatViewerDate,
  formatViewerDateTime,
  formatViewerTime,
} from "../../../../lib/time-formatting";

const PACKAGE_PURCHASE_PLAN_CODE_TO_COUNT: Record<string, number> = {
  SESSIONS_4: 4,
  SESSIONS_6: 6,
  SESSIONS_8: 8,
};

const PACKAGE_PURCHASE_STATUS_TO_TONE: Record<
  PatientPackagePurchaseItem["status"],
  "success" | "warning" | "default"
> = {
  ACTIVE: "success",
  PENDING_PAYMENT: "warning",
  COMPLETED: "default",
  CANCELLED: "default",
  EXPIRED: "default",
  REFUNDED: "default",
};

const PACKAGE_PURCHASE_SESSION_PRESENTATION_STATUS_TO_TONE: Partial<Record<
  PatientPackagePurchaseItem["linkedSessions"]["items"][number]["presentationStatus"],
  "success" | "warning" | "info" | "default"
>> = {
  UPCOMING: "warning",
  READY_TO_JOIN: "success",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "default",
  AWAITING_COMPLETION_CONFIRMATION: "warning",
  EXPIRED: "default",
  PATIENT_NO_SHOW: "default",
  PRACTITIONER_NO_SHOW: "default",
  BOTH_NO_SHOW: "default",
};

const warnedPackagePurchaseContractMismatches = new Set<string>();

export function formatMoney(
  amount: string | null | undefined,
  currencyCode: string | null | undefined,
  locale: string,
) {
  if (!amount || !currencyCode) {
    return "-";
  }

  const num = Number(amount);
  if (!Number.isFinite(num)) {
    return `${amount} ${currencyCode.toUpperCase()}`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDatetime(value: string | null | undefined, locale: string) {
  if (!value) {
    return "-";
  }

  return formatViewerDateTime(value, { locale });
}

export function formatTimeRange(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
  locale: string,
) {
  if (!startAt && !endAt) {
    return "-";
  }

  const startLabel = startAt ? formatViewerTime(startAt, { locale }) : "-";
  const endLabel = endAt ? formatViewerTime(endAt, { locale }) : "-";
  return `${startLabel} - ${endLabel}`;
}

export function formatSessionDateTimeRange(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
  locale: string,
) {
  if (!startAt && !endAt) {
    return "-";
  }

  const dateSource = startAt ?? endAt ?? null;
  const dateLabel = dateSource
    ? formatViewerDate(dateSource, { locale })
    : "-";

  const timeLabel = formatTimeRange(startAt, endAt, locale);
  return `${dateLabel} · ${timeLabel}`;
}

export function resolvePackagePurchasePlanCount(planCode: string | null | undefined) {
  if (!planCode) {
    return null;
  }

  return PACKAGE_PURCHASE_PLAN_CODE_TO_COUNT[planCode.trim().toUpperCase()] ?? null;
}

export function hasPackagePurchasePlanMismatch(
  planCode: string | null | undefined,
  sessionCount: number,
) {
  const expectedSessionCount = resolvePackagePurchasePlanCount(planCode);

  return expectedSessionCount !== null && expectedSessionCount !== sessionCount;
}

export function warnPackagePurchaseContractMismatch(input: {
  purchaseId: string;
  planCode: string | null | undefined;
  sessionCount: number;
  linkedSessionsCount: number;
}) {
  if (typeof __DEV__ === "undefined" || !__DEV__) {
    return;
  }

  const normalizedPlanCode = input.planCode?.trim().toUpperCase() ?? "UNKNOWN";
  const warningKey = [
    input.purchaseId,
    normalizedPlanCode,
    input.sessionCount,
    input.linkedSessionsCount,
  ].join(":");

  if (warnedPackagePurchaseContractMismatches.has(warningKey)) {
    return;
  }

  warnedPackagePurchaseContractMismatches.add(warningKey);

  console.warn(
    [
      "[Sawiyaa package purchases] contract mismatch",
      `purchaseId=${input.purchaseId}`,
      `planCode=${normalizedPlanCode}`,
      `sessionCount=${input.sessionCount}`,
      `linkedSessionsCount=${input.linkedSessionsCount}`,
    ].join(" "),
  );
}

export function getPackagePurchasePlanTranslationKey(
  planCode: string | null | undefined,
) {
  const normalized = planCode?.trim().toUpperCase() ?? "";

  switch (normalized) {
    case "SESSIONS_4":
      return "packagePurchases.plans.SESSIONS_4";
    case "SESSIONS_6":
      return "packagePurchases.plans.SESSIONS_6";
    case "SESSIONS_8":
      return "packagePurchases.plans.SESSIONS_8";
    default:
      return "packagePurchases.plans.generic";
  }
}

export function getPackagePurchaseStatusTranslationKey(
  status: PatientPackagePurchaseItem["status"],
) {
  switch (status) {
    case "ACTIVE":
      return "packagePurchases.statuses.ACTIVE";
    case "PENDING_PAYMENT":
      return "packagePurchases.statuses.PENDING_PAYMENT";
    case "COMPLETED":
      return "packagePurchases.statuses.COMPLETED";
    case "CANCELLED":
      return "packagePurchases.statuses.CANCELLED";
    case "EXPIRED":
      return "packagePurchases.statuses.EXPIRED";
    case "REFUNDED":
      return "packagePurchases.statuses.REFUNDED";
    default:
      return "packagePurchases.statuses.UNKNOWN";
  }
}

export function getPackagePurchaseStatusTone(
  status: PatientPackagePurchaseItem["status"],
) {
  return PACKAGE_PURCHASE_STATUS_TO_TONE[status] ?? "default";
}

export function getPackagePurchaseSessionPresentationStatusTranslationKey(
  presentationStatus: PatientPackagePurchaseItem["linkedSessions"]["items"][number]["presentationStatus"],
) {
  switch (presentationStatus) {
    case "UPCOMING":
      return "packagePurchases.presentationStatuses.UPCOMING";
    case "READY_TO_JOIN":
      return "packagePurchases.presentationStatuses.READY_TO_JOIN";
    case "IN_PROGRESS":
      return "packagePurchases.presentationStatuses.IN_PROGRESS";
    case "COMPLETED":
      return "packagePurchases.presentationStatuses.COMPLETED";
    case "CANCELLED":
      return "packagePurchases.presentationStatuses.CANCELLED";
    case "AWAITING_COMPLETION_CONFIRMATION":
      return "packagePurchases.presentationStatuses.AWAITING_COMPLETION_CONFIRMATION";
    case "EXPIRED":
      return "packagePurchases.presentationStatuses.EXPIRED";
    case "PATIENT_NO_SHOW":
      return "packagePurchases.presentationStatuses.PATIENT_NO_SHOW";
    case "PRACTITIONER_NO_SHOW":
      return "packagePurchases.presentationStatuses.PRACTITIONER_NO_SHOW";
    case "BOTH_NO_SHOW":
      return "packagePurchases.presentationStatuses.BOTH_NO_SHOW";
    default:
      return "packagePurchases.presentationStatuses.UNKNOWN";
  }
}

export function getPackagePurchaseSessionPresentationStatusTone(
  presentationStatus: PatientPackagePurchaseItem["linkedSessions"]["items"][number]["presentationStatus"],
) {
  return PACKAGE_PURCHASE_SESSION_PRESENTATION_STATUS_TO_TONE[presentationStatus] ?? "default";
}

export function getPackagePurchaseSessionModeTranslationKey(mode: string | null | undefined) {
  const normalized = mode?.trim().toUpperCase() ?? "";

  switch (normalized) {
    case "VIDEO":
      return "packagePurchases.sessionModes.VIDEO";
    case "AUDIO":
      return "packagePurchases.sessionModes.AUDIO";
    case "CHAT":
      return "packagePurchases.sessionModes.CHAT";
    default:
      return "packagePurchases.sessionModes.UNKNOWN";
  }
}

export function sortPackagePurchaseSessions(
  sessions: PatientPackagePurchaseItem["linkedSessions"]["items"],
) {
  return [...sessions].sort((left, right) => {
    const leftTime = left.scheduledStartAt ? new Date(left.scheduledStartAt).getTime() : 0;
    const rightTime = right.scheduledStartAt ? new Date(right.scheduledStartAt).getTime() : 0;
    return leftTime - rightTime;
  });
}

export function getPackagePurchaseBookedSessionCount(
  purchase: PatientPackagePurchaseItem,
) {
  return purchase.linkedSessions.items.length;
}

export function getPackagePurchaseUnbookedSessionCount(
  purchase: PatientPackagePurchaseItem,
) {
  return Math.max(
    purchase.sessionCount - getPackagePurchaseBookedSessionCount(purchase),
    0,
  );
}

export function getPackagePurchaseUnbookedSessionIndexes(
  purchase: PatientPackagePurchaseItem,
) {
  const bookedIndexes = new Set(
    purchase.linkedSessions.items
      .map((session) => session.packageSessionIndex)
      .filter((index): index is number => Number.isInteger(index) && index > 0),
  );

  const missingIndexes: number[] = [];
  for (let index = 1; index <= purchase.sessionCount; index += 1) {
    if (!bookedIndexes.has(index)) {
      missingIndexes.push(index);
    }
  }

  return missingIndexes;
}

export function getPackagePurchaseCompletionCount(
  purchase: PatientPackagePurchaseItem,
) {
  return purchase.linkedSessions.items.filter((session) =>
    ["COMPLETED"].includes(session.presentationStatus),
  ).length;
}

export function getPackagePurchasePendingCount(
  purchase: PatientPackagePurchaseItem,
) {
  return purchase.linkedSessions.items.filter((session) =>
    ["UPCOMING", "PENDING_PRACTITIONER_CONFIRMATION"].includes(session.status),
  ).length;
}

export function getPackagePurchaseLiveCount(
  purchase: PatientPackagePurchaseItem,
) {
  return purchase.linkedSessions.items.filter((session) =>
    ["READY_TO_JOIN", "IN_PROGRESS"].includes(session.status),
  ).length;
}

export function getPackagePurchaseTerminalCount(
  purchase: PatientPackagePurchaseItem,
) {
  return purchase.linkedSessions.items.filter((session) =>
    ["CANCELLED", "PATIENT_NO_SHOW", "PRACTITIONER_NO_SHOW", "BOTH_NO_SHOW", "EXPIRED", "AWAITING_COMPLETION_CONFIRMATION"].includes(session.status),
  ).length;
}

export function getNextUpcomingPackageSession(
  purchase: PatientPackagePurchaseItem,
) {
  return sortPackagePurchaseSessions(purchase.linkedSessions.items).find((session) =>
    ["UPCOMING", "READY_TO_JOIN", "IN_PROGRESS"].includes(session.status),
  );
}

export function groupPackagePurchaseSessions(
  purchase: PatientPackagePurchaseItem,
) {
  const sessions = sortPackagePurchaseSessions(purchase.linkedSessions.items);
  return {
    booked: sessions,
    unbooked: getPackagePurchaseUnbookedSessionIndexes(purchase),
    upcoming: sessions.filter((session) =>
      ["UPCOMING", "READY_TO_JOIN", "IN_PROGRESS", "PENDING_PRACTITIONER_CONFIRMATION"].includes(
        session.status,
      ),
    ),
    completed: sessions.filter((session) => session.presentationStatus === "COMPLETED"),
    terminal: sessions.filter((session) =>
      ["CANCELLED", "PATIENT_NO_SHOW", "PRACTITIONER_NO_SHOW", "BOTH_NO_SHOW", "EXPIRED", "AWAITING_COMPLETION_CONFIRMATION"].includes(session.status),
    ),
  };
}

export function canContinuePackagePurchasePayment(
  purchase: PatientPackagePurchaseItem,
) {
  return (
    purchase.status === "PENDING_PAYMENT" &&
    Boolean(purchase.paymentExpiresAt) &&
    new Date(purchase.paymentExpiresAt!).getTime() > Date.now()
  );
}

export function isPackagePurchasePaymentExpired(
  purchase: PatientPackagePurchaseItem,
) {
  if (!purchase.paymentExpiresAt) {
    return false;
  }

  return new Date(purchase.paymentExpiresAt).getTime() <= Date.now();
}
