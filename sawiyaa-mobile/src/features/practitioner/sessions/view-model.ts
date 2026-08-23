import type { PractitionerSessionListItem, SessionStatus } from "./types";

export type PractitionerSessionsSection = "upcoming" | "history";
export type PractitionerSessionAction = "join" | "prepare" | "review" | "view";
export type PractitionerSessionStatusKey =
  | "actionRequired"
  | "readyToJoin"
  | "inProgress"
  | "upcoming"
  | "underReview"
  | "completed"
  | "cancelled"
  | "noShow"
  | "unavailable";

const HISTORY_STATES = new Set<SessionStatus>([
  "COMPLETED",
  "CANCELLED",
  "PATIENT_NO_SHOW",
  "PRACTITIONER_NO_SHOW",
  "BOTH_NO_SHOW",
  "EXPIRED",
]);

export function hasPractitionerSessionRequiredAction(
  session: PractitionerSessionListItem,
): boolean {
  return Boolean(
    session.operational?.resolution.required ||
      session.operational?.actions.canReview ||
      session.operational?.actions.canMarkPatientNoShow,
  );
}

export function isPractitionerSessionHistory(
  session: PractitionerSessionListItem,
): boolean {
  // Required follow-up remains in Upcoming so it is not buried in history.
  if (hasPractitionerSessionRequiredAction(session)) return false;

  return (
    session.operational?.timelineBucket === "COMPLETED" ||
    session.operational?.timelineBucket === "TERMINAL" ||
    HISTORY_STATES.has(session.operational?.state)
  );
}

export function splitPractitionerSessions(sessions: PractitionerSessionListItem[]) {
  return {
    upcoming: sessions.filter((session) => !isPractitionerSessionHistory(session)),
    history: sessions.filter(isPractitionerSessionHistory),
  } satisfies Record<PractitionerSessionsSection, PractitionerSessionListItem[]>;
}

export function getPractitionerSessionAction(
  session: PractitionerSessionListItem,
): PractitionerSessionAction {
  if (hasPractitionerSessionRequiredAction(session)) return "review";
  if (session.operational?.join.allowed || session.operational?.actions.canJoin) {
    return "join";
  }
  if (
    session.operational?.join.canPrepareRuntime ||
    session.operational?.actions.canPrepareRuntime
  ) {
    return "prepare";
  }
  return "view";
}

export function getPractitionerSessionStatusKey(
  session: PractitionerSessionListItem,
): PractitionerSessionStatusKey {
  if (hasPractitionerSessionRequiredAction(session)) return "actionRequired";

  switch (session.operational?.state) {
    case "READY_TO_JOIN":
      return "readyToJoin";
    case "IN_PROGRESS":
      return "inProgress";
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
    case "AWAITING_ADMIN_RESOLUTION":
      return "underReview";
    default:
      return "upcoming";
  }
}

export function sortPractitionerSessions(
  sessions: PractitionerSessionListItem[],
  section: PractitionerSessionsSection,
): PractitionerSessionListItem[] {
  const direction = section === "upcoming" ? 1 : -1;

  return [...sessions].sort((left, right) => {
    if (section === "upcoming") {
      const leftPriority = getPriorityRank(left);
      const rightPriority = getPriorityRank(right);
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    }

    const leftTime = getSessionTime(left);
    const rightTime = getSessionTime(right);
    if (leftTime === rightTime) return left.id.localeCompare(right.id);
    return (leftTime - rightTime) * direction;
  });
}

export function selectPractitionerSessionPriority(
  sessions: PractitionerSessionListItem[],
): PractitionerSessionListItem | null {
  return sortPractitionerSessions(sessions, "upcoming")[0] ?? null;
}

function getPriorityRank(session: PractitionerSessionListItem): number {
  if (hasPractitionerSessionRequiredAction(session)) return 0;
  if (session.operational?.join.allowed) return 1;
  if (session.operational?.timelineBucket === "ACTIONABLE") return 2;
  return 3;
}

function getSessionTime(session: PractitionerSessionListItem): number {
  const time = session.scheduledStartAt
    ? new Date(session.scheduledStartAt).getTime()
    : Number.POSITIVE_INFINITY;
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}
