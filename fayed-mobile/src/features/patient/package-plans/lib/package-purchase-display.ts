import type { PatientPackagePurchaseItem } from "../types";

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

export function sortPackagePurchaseSessions(
  sessions: PatientPackagePurchaseItem["linkedSessions"]["items"],
) {
  return [...sessions].sort((left, right) => {
    const leftTime = left.scheduledStartAt ? new Date(left.scheduledStartAt).getTime() : 0;
    const rightTime = right.scheduledStartAt ? new Date(right.scheduledStartAt).getTime() : 0;
    return leftTime - rightTime;
  });
}

export function getPackagePurchaseCompletionCount(
  purchase: PatientPackagePurchaseItem,
) {
  return purchase.linkedSessions.items.filter((session) =>
    ["COMPLETED"].includes(session.status),
  ).length;
}

export function getPackagePurchasePendingCount(
  purchase: PatientPackagePurchaseItem,
) {
  return purchase.linkedSessions.items.filter((session) =>
    ["DRAFT", "PENDING_PAYMENT", "PENDING_PRACTITIONER_RESPONSE"].includes(session.status),
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
    ["CANCELLED", "NO_SHOW", "EXPIRED", "REFUND_PENDING", "REFUNDED"].includes(
      session.status,
    ),
  ).length;
}

export function getNextUpcomingPackageSession(
  purchase: PatientPackagePurchaseItem,
) {
  return sortPackagePurchaseSessions(purchase.linkedSessions.items).find((session) =>
    ["CONFIRMED", "UPCOMING", "READY_TO_JOIN", "IN_PROGRESS"].includes(
      session.status,
    ),
  );
}

export function groupPackagePurchaseSessions(
  purchase: PatientPackagePurchaseItem,
) {
  const sessions = sortPackagePurchaseSessions(purchase.linkedSessions.items);
  return {
    live: sessions.filter((session) =>
      ["READY_TO_JOIN", "IN_PROGRESS"].includes(session.status),
    ),
    pending: sessions.filter((session) =>
      ["DRAFT", "PENDING_PAYMENT", "PENDING_PRACTITIONER_RESPONSE", "CONFIRMED", "UPCOMING"].includes(
        session.status,
      ),
    ),
    completed: sessions.filter((session) => session.status === "COMPLETED"),
    terminal: sessions.filter((session) =>
      ["CANCELLED", "NO_SHOW", "EXPIRED", "REFUND_PENDING", "REFUNDED"].includes(
        session.status,
      ),
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
