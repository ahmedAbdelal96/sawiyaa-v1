import { formatViewerDate, formatViewerDateTime } from "@/lib/time-formatting";
import type { SessionStatus } from "@/features/sessions/types/sessions.types";
import type {
  PatientPackagePurchaseItem,
  PatientPackagePurchaseSessionSummary,
  PackagePurchaseStatus,
} from "../types/package-purchases.types";

const LIVE_SESSION_STATUSES = new Set<SessionStatus>([
  "UPCOMING",
  "READY_TO_JOIN",
  "IN_PROGRESS",
]);

const COMPLETED_SESSION_STATUSES = new Set<SessionStatus>(["COMPLETED"]);
const PENDING_SESSION_STATUSES = new Set<SessionStatus>([
  "PENDING_PAYMENT",
  "PENDING_PRACTITIONER_CONFIRMATION",
]);
const TERMINAL_SESSION_STATUSES = new Set<SessionStatus>([
  "CANCELLED",
  "EXPIRED",
  "PATIENT_NO_SHOW",
  "PRACTITIONER_NO_SHOW",
  "BOTH_NO_SHOW",
  "AWAITING_COMPLETION_CONFIRMATION",
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

export interface PackageStatusPresentationConfig {
  labelKey: string;
  tone: "success" | "dark" | "warning" | "light";
}

export function getPackagePurchaseStatusConfig(
  status: PackagePurchaseStatus | string,
): PackageStatusPresentationConfig {
  switch (status) {
    case "ACTIVE":
      return { labelKey: "list.status.ACTIVE", tone: "success" };
    case "COMPLETED":
      return { labelKey: "list.status.COMPLETED", tone: "dark" };
    case "PENDING_PAYMENT":
      return { labelKey: "list.status.PENDING_PAYMENT", tone: "warning" };
    case "CANCELLED":
      return { labelKey: "list.status.CANCELLED", tone: "light" };
    case "EXPIRED":
      return { labelKey: "list.status.EXPIRED", tone: "light" };
    case "REFUNDED":
      return { labelKey: "list.status.REFUNDED", tone: "light" };
    default:
      return { labelKey: "list.status.ACTIVE", tone: "light" };
  }
}

export function formatPackageDisplayTitle(input: {
  title?: string | null;
  sessionCount: number;
  t: (key: string, values?: Record<string, any>) => string;
}): string {
  if (input.title?.trim()) {
    return input.title.trim();
  }
  if (input.sessionCount > 0) {
    return input.t("list.table.packageSessionsLabel", { sessions: input.sessionCount });
  }
  return input.t("detail.packageEyebrow");
}

export function getPackagePurchaseCompletionCount(
  purchase: Pick<PatientPackagePurchaseItem, "linkedSessions" | "progress">,
): number {
  return purchase.progress?.completedSessions ?? purchase.linkedSessions.items.filter((session) => session.status === "COMPLETED").length;
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
