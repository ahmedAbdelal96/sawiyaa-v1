import type { PatientPackagePurchaseItem } from "../types";

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

const PACKAGE_PURCHASE_SESSION_PRESENTATION_STATUS_TO_TONE: Record<
  PatientPackagePurchaseItem["linkedSessions"]["items"][number]["presentationStatus"],
  "success" | "warning" | "info" | "default"
> = {
  UPCOMING: "warning",
  JOINABLE: "success",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "default",
  ENDED: "default",
  UNAVAILABLE: "default",
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

  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  }).format(new Date(value));
}

export function formatTimeRange(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
  locale: string,
) {
  if (!startAt && !endAt) {
    return "-";
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });

  const startLabel = startAt ? formatter.format(new Date(startAt)) : "-";
  const endLabel = endAt ? formatter.format(new Date(endAt)) : "-";
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
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        hour12: !locale.startsWith("ar"),
      }).format(new Date(dateSource))
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
      "[Fayed package purchases] contract mismatch",
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
    case "JOINABLE":
      return "packagePurchases.presentationStatuses.JOINABLE";
    case "IN_PROGRESS":
      return "packagePurchases.presentationStatuses.IN_PROGRESS";
    case "COMPLETED":
      return "packagePurchases.presentationStatuses.COMPLETED";
    case "CANCELLED":
      return "packagePurchases.presentationStatuses.CANCELLED";
    case "ENDED":
      return "packagePurchases.presentationStatuses.ENDED";
    case "UNAVAILABLE":
      return "packagePurchases.presentationStatuses.UNAVAILABLE";
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
    ["UPCOMING", "UNAVAILABLE"].includes(session.presentationStatus),
  ).length;
}

export function getPackagePurchaseLiveCount(
  purchase: PatientPackagePurchaseItem,
) {
  return purchase.linkedSessions.items.filter((session) =>
    ["JOINABLE", "IN_PROGRESS"].includes(session.presentationStatus),
  ).length;
}

export function getPackagePurchaseTerminalCount(
  purchase: PatientPackagePurchaseItem,
) {
  return purchase.linkedSessions.items.filter((session) =>
    ["CANCELLED", "ENDED"].includes(session.presentationStatus),
  ).length;
}

export function getNextUpcomingPackageSession(
  purchase: PatientPackagePurchaseItem,
) {
  return sortPackagePurchaseSessions(purchase.linkedSessions.items).find((session) =>
    ["UPCOMING", "JOINABLE", "IN_PROGRESS"].includes(session.presentationStatus),
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
      ["UPCOMING", "JOINABLE", "IN_PROGRESS", "UNAVAILABLE"].includes(
        session.presentationStatus,
      ),
    ),
    completed: sessions.filter((session) => session.presentationStatus === "COMPLETED"),
    terminal: sessions.filter((session) =>
      ["CANCELLED", "ENDED"].includes(session.presentationStatus),
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
