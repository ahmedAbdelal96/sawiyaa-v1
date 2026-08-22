import type { SessionListItem, SessionStatus } from "./types";

export type PatientSessionsBucket = "upcoming" | "history";
export type PatientSessionPrimaryAction = "join" | "pay" | "view";
export type PatientSessionStatusKey =
  | "upcoming"
  | "readyToJoin"
  | "inProgress"
  | "paymentRequired"
  | "underReview"
  | "completed"
  | "cancelled"
  | "noShow"
  | "unavailable";

export function isPatientSessionHistory(session: SessionListItem): boolean {
  const actions = session.operational?.actions;
  if (actions?.canJoin || actions?.canPay || actions?.canReview) {
    return false;
  }

  return (
    session.operational?.timelineBucket === "COMPLETED" ||
    session.operational?.timelineBucket === "TERMINAL"
  );
}

export function getPatientSessionBucket(
  session: SessionListItem,
): PatientSessionsBucket {
  return isPatientSessionHistory(session) ? "history" : "upcoming";
}

export function getPatientSessionPrimaryAction(
  session: SessionListItem,
): PatientSessionPrimaryAction {
  const actions = session.operational?.actions;
  if (actions?.canJoin) return "join";
  if (actions?.canPay) return "pay";
  return "view";
}

export function getPatientSessionPriority(session: SessionListItem): number {
  const actions = session.operational?.actions;
  if (actions?.canReview) return 0;
  if (actions?.canJoin) return 1;
  if (actions?.canPay) return 2;
  return getPatientSessionBucket(session) === "upcoming" ? 3 : 4;
}

export function getPatientSessionStatusKey(
  status: SessionStatus | string | null | undefined,
): PatientSessionStatusKey {
  switch (status) {
    case "PENDING_PAYMENT":
      return "paymentRequired";
    case "READY_TO_JOIN":
      return "readyToJoin";
    case "IN_PROGRESS":
      return "inProgress";
    case "PENDING_PRACTITIONER_CONFIRMATION":
    case "AWAITING_ADMIN_RESOLUTION":
    case "AWAITING_COMPLETION_CONFIRMATION":
      return "underReview";
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "PATIENT_NO_SHOW":
    case "PRACTITIONER_NO_SHOW":
    case "BOTH_NO_SHOW":
      return "noShow";
    case "EXPIRED":
      return "unavailable";
    case "UPCOMING":
    case "DRAFT":
    default:
      return "upcoming";
  }
}

export function splitPatientSessions(sessions: SessionListItem[]) {
  const upcoming = sessions
    .filter((session) => getPatientSessionBucket(session) === "upcoming")
    .sort(compareUpcomingSessions);
  const history = sessions
    .filter((session) => getPatientSessionBucket(session) === "history")
    .sort((left, right) => getSessionTimestamp(right) - getSessionTimestamp(left));

  return { upcoming, history };
}

function compareUpcomingSessions(left: SessionListItem, right: SessionListItem) {
  const priorityDifference =
    getPatientSessionPriority(left) - getPatientSessionPriority(right);
  if (priorityDifference !== 0) return priorityDifference;
  return getSessionTimestamp(left) - getSessionTimestamp(right);
}

function getSessionTimestamp(session: SessionListItem) {
  const raw = session.scheduledStartAt ?? session.scheduledEndAt;
  if (!raw) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(raw).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}
