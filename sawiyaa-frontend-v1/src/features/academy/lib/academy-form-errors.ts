import { toAppError } from "@/lib/api/errors";

export type AcademyPlanFieldKey =
  | "plannedDurationDays"
  | "plannedLectureCount"
  | "startsAt"
  | "endsAt";

export type AcademyPlanFieldIssue = "required" | "invalidWindow" | "invalidDuration" | "invalidCount";

function isAcademyPlanFieldKey(value: unknown): value is AcademyPlanFieldKey {
  return (
    value === "plannedDurationDays" ||
    value === "plannedLectureCount" ||
    value === "startsAt" ||
    value === "endsAt"
  );
}

function markField(
  target: Partial<Record<AcademyPlanFieldKey, AcademyPlanFieldIssue>>,
  field: AcademyPlanFieldKey,
  issue: AcademyPlanFieldIssue,
) {
  target[field] = issue;
}

export function getAcademyPlanFieldIssues(error: unknown) {
  const appError = toAppError(error);
  const fieldIssues: Partial<Record<AcademyPlanFieldKey, AcademyPlanFieldIssue>> = {};

  if (appError.code === "ACADEMY_MISSING_PLAN") {
    const missingFields = Array.isArray(appError.details?.missingFields)
      ? appError.details?.missingFields
      : [];

    for (const field of missingFields) {
      if (!isAcademyPlanFieldKey(field)) continue;
      markField(fieldIssues, field, "required");
    }

    return fieldIssues;
  }

  if (appError.code === "ACADEMY_INVALID_PLAN_WINDOW") {
    markField(fieldIssues, "endsAt", "invalidWindow");
    return fieldIssues;
  }

  if (appError.code === "ACADEMY_INVALID_DURATION") {
    markField(fieldIssues, "plannedDurationDays", "invalidDuration");
    return fieldIssues;
  }

  if (appError.code === "ACADEMY_INVALID_LECTURE_COUNT") {
    markField(fieldIssues, "plannedLectureCount", "invalidCount");
    return fieldIssues;
  }

  return fieldIssues;
}
