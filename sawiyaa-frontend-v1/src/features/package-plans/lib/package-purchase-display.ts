import { formatViewerDate, formatViewerDateTime } from "@/lib/time-formatting";
import type { SessionStatus } from "@/features/sessions/types/sessions.types";
import type {
  PatientPackagePurchaseItem,
  PatientPackagePurchaseSessionSummary,
  PackagePurchaseStatus,
} from "../types/package-purchases.types";

const LIVE_SESSION_STATUSES = new Set<SessionStatus>([
  "CONFIRMED",
  "UPCOMING",
  "READY_TO_JOIN",
  "IN_PROGRESS",
]);

const COMPLETED_SESSION_STATUSES = new Set<SessionStatus>(["COMPLETED"]);
const PENDING_SESSION_STATUSES = new Set<SessionStatus>([
  "PENDING_PAYMENT",
  "PENDING_PRACTITIONER_RESPONSE",
]);
const TERMINAL_SESSION_STATUSES = new Set<SessionStatus>([
  "CANCELLED",
  "EXPIRED",
  "NO_SHOW",
  "REFUNDED",
]);

const SESSION_STATUS_ORDER = {
  live: 0,
  upcoming: 1,
  completed: 2,
  pending: 3,
  terminal: 4,
  other: 5,
} as const;

function toTimeValue(isoString: string | null): number {
  if (!isoString) return Number.POSITIVE_INFINITY;
  const time = new Date(isoString).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

export function formatDatetime(isoString: string | null, locale: string): string {
  return formatViewerDateTime(isoString, { locale });
}

export function formatDate(isoString: string | null, locale: string): string {
  return formatViewerDate(isoString, { locale });
}

export function formatMoney(amount: string, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount || "0"));
}

export function isPackagePurchasePaymentExpired(
  purchase: Pick<PatientPackagePurchaseItem, "status" | "paymentExpiresAt">,
  now = Date.now(),
): boolean {
  if (purchase.status !== "PENDING_PAYMENT") return false;
  if (!purchase.paymentExpiresAt) return false;
  const expiresAt = new Date(purchase.paymentExpiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= now;
}

export function canContinuePackagePurchasePayment(
  purchase: Pick<PatientPackagePurchaseItem, "status" | "paymentExpiresAt">,
  now = Date.now(),
): boolean {
  return purchase.status === "PENDING_PAYMENT" && !isPackagePurchasePaymentExpired(purchase, now);
}

export function getPackagePurchaseStatusLabelKey(status: PackagePurchaseStatus): string {
  return `package-purchases.status.${status}`;
}

export function getPackagePurchaseCompletionCount(
  purchase: Pick<PatientPackagePurchaseItem, "linkedSessions" | "sessionCount">,
): number {
  return purchase.linkedSessions.items.filter((session) => session.status === "COMPLETED").length;
}

export function getPackagePurchasePendingCount(
  purchase: Pick<PatientPackagePurchaseItem, "linkedSessions">,
): number {
  return purchase.linkedSessions.items.filter((session) => PENDING_SESSION_STATUSES.has(session.status)).length;
}

export function getPackagePurchaseLiveCount(
  purchase: Pick<PatientPackagePurchaseItem, "linkedSessions">,
): number {
  return purchase.linkedSessions.items.filter((session) => LIVE_SESSION_STATUSES.has(session.status)).length;
}

export function getPackagePurchaseTerminalCount(
  purchase: Pick<PatientPackagePurchaseItem, "linkedSessions">,
): number {
  return purchase.linkedSessions.items.filter((session) => TERMINAL_SESSION_STATUSES.has(session.status)).length;
}

function getSessionBucket(session: PatientPackagePurchaseSessionSummary) {
  if (LIVE_SESSION_STATUSES.has(session.status)) return "live";
  if (COMPLETED_SESSION_STATUSES.has(session.status)) return "completed";
  if (PENDING_SESSION_STATUSES.has(session.status)) return "pending";
  if (TERMINAL_SESSION_STATUSES.has(session.status)) return "terminal";
  return "other";
}

export function sortPackagePurchaseSessions(
  sessions: PatientPackagePurchaseSessionSummary[],
): PatientPackagePurchaseSessionSummary[] {
  return [...sessions].sort((left, right) => {
    const leftBucket = getSessionBucket(left);
    const rightBucket = getSessionBucket(right);

    if (SESSION_STATUS_ORDER[leftBucket] !== SESSION_STATUS_ORDER[rightBucket]) {
      return SESSION_STATUS_ORDER[leftBucket] - SESSION_STATUS_ORDER[rightBucket];
    }

    const leftTime = toTimeValue(left.scheduledStartAt);
    const rightTime = toTimeValue(right.scheduledStartAt);

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.packageSessionIndex - right.packageSessionIndex;
  });
}

export function getNextUpcomingPackageSession(
  purchase: Pick<PatientPackagePurchaseItem, "linkedSessions">,
): PatientPackagePurchaseSessionSummary | null {
  return (
    sortPackagePurchaseSessions(purchase.linkedSessions.items).find((session) =>
      LIVE_SESSION_STATUSES.has(session.status),
    ) ?? null
  );
}

export function groupPackagePurchaseSessions(
  purchase: Pick<PatientPackagePurchaseItem, "linkedSessions">,
): {
  live: PatientPackagePurchaseSessionSummary[];
  completed: PatientPackagePurchaseSessionSummary[];
  pending: PatientPackagePurchaseSessionSummary[];
  terminal: PatientPackagePurchaseSessionSummary[];
  other: PatientPackagePurchaseSessionSummary[];
} {
  const sorted = sortPackagePurchaseSessions(purchase.linkedSessions.items);
  return {
    live: sorted.filter((session) => LIVE_SESSION_STATUSES.has(session.status)),
    completed: sorted.filter((session) => COMPLETED_SESSION_STATUSES.has(session.status)),
    pending: sorted.filter((session) => PENDING_SESSION_STATUSES.has(session.status)),
    terminal: sorted.filter((session) => TERMINAL_SESSION_STATUSES.has(session.status)),
    other: sorted.filter(
      (session) =>
        !LIVE_SESSION_STATUSES.has(session.status) &&
        !COMPLETED_SESSION_STATUSES.has(session.status) &&
        !PENDING_SESSION_STATUSES.has(session.status) &&
        !TERMINAL_SESSION_STATUSES.has(session.status),
    ),
  };
}
