import type { PractitionerSessionListItem } from "../sessions/types";
import { getPractitionerSessionAction } from "../sessions/view-model";
import { getDatePartsInTimeZone } from "../../../lib/time-formatting";

const UPCOMING_BUCKETS = new Set(["PENDING", "ACTIONABLE"]);

export type PractitionerHomeAction = "join" | "prepare" | "review" | "view";

export function shouldShowPractitionerHomeTodaySummary(
  todaySessionCount: number,
  upcomingSessionCount: number,
): boolean {
  return todaySessionCount > 0 || upcomingSessionCount > 0;
}

export function hasPractitionerSessionRequiredAction(
  session: PractitionerSessionListItem,
): boolean {
  return Boolean(
    session.operational?.resolution.required ||
      session.operational?.actions.canReview ||
      session.operational?.actions.canMarkPatientNoShow,
  );
}

export function selectPractitionerHomeSessions(
  sessions: PractitionerSessionListItem[],
): PractitionerSessionListItem[] {
  return sessions
    .filter(
      (session) =>
        Boolean(session.scheduledStartAt) &&
        UPCOMING_BUCKETS.has(session.operational?.timelineBucket ?? ""),
    )
    .sort((left, right) => {
      const leftTime = left.scheduledStartAt
        ? new Date(left.scheduledStartAt).getTime()
        : Number.POSITIVE_INFINITY;
      const rightTime = right.scheduledStartAt
        ? new Date(right.scheduledStartAt).getTime()
        : Number.POSITIVE_INFINITY;

      return leftTime - rightTime;
    });
}

export function selectPractitionerHomeNextSession(
  sessions: PractitionerSessionListItem[],
): PractitionerSessionListItem | null {
  const requiredAction = sessions.find(hasPractitionerSessionRequiredAction);
  return requiredAction ?? selectPractitionerHomeSessions(sessions)[0] ?? null;
}

export function selectPractitionerHomeUrgentSession(
  sessions: PractitionerSessionListItem[],
): PractitionerSessionListItem | null {
  return sessions.find(hasPractitionerSessionRequiredAction) ?? null;
}

export function getPractitionerHomeAction(
  session: PractitionerSessionListItem,
): PractitionerHomeAction {
  return getPractitionerSessionAction(session);
}

export function countPractitionerSessionsToday(
  sessions: PractitionerSessionListItem[],
  now: Date,
  timeZone: string | null | undefined,
): number {
  const today = getDatePartsInTimeZone(now, timeZone);
  if (!today) return 0;

  return sessions.filter((session) => {
    const parts = getDatePartsInTimeZone(session.scheduledStartAt, timeZone);
    return Boolean(
      parts &&
        parts.year === today.year &&
        parts.month === today.month &&
        parts.day === today.day,
    );
  }).length;
}
