import { toAppError } from "@/lib/api/errors";

export type AcademyLectureFieldKey = "lectureOrder" | "lectureTitle" | "startsAt" | "endsAt";
export type AcademyLectureFieldIssue = "required" | "invalidWindow" | "limitReached" | "orderTaken";

function isAcademyLectureFieldKey(value: unknown): value is AcademyLectureFieldKey {
  return (
    value === "lectureOrder" ||
    value === "lectureTitle" ||
    value === "startsAt" ||
    value === "endsAt"
  );
}

function markField(
  target: Partial<Record<AcademyLectureFieldKey, AcademyLectureFieldIssue>>,
  field: AcademyLectureFieldKey,
  issue: AcademyLectureFieldIssue,
) {
  target[field] = issue;
}

export function getAcademyLectureFieldIssues(error: unknown) {
  const appError = toAppError(error);
  const fieldIssues: Partial<Record<AcademyLectureFieldKey, AcademyLectureFieldIssue>> = {};

  if (appError.code === "ACADEMY_MISSING_LECTURE_PLAN") {
    markField(fieldIssues, "startsAt", "required");
    markField(fieldIssues, "lectureOrder", "required");
    return fieldIssues;
  }

  if (appError.code === "ACADEMY_INVALID_LECTURE_WINDOW") {
    markField(fieldIssues, "startsAt", "invalidWindow");
    markField(fieldIssues, "endsAt", "invalidWindow");
    return fieldIssues;
  }

  if (appError.code === "ACADEMY_LECTURE_ORDER_TAKEN") {
    markField(fieldIssues, "lectureOrder", "orderTaken");
    return fieldIssues;
  }

  if (appError.code === "ACADEMY_LECTURE_LIMIT_REACHED") {
    markField(fieldIssues, "lectureOrder", "limitReached");
    return fieldIssues;
  }

  const missingFields = Array.isArray(appError.details?.missingFields)
    ? appError.details?.missingFields
    : [];

  for (const field of missingFields) {
    if (!isAcademyLectureFieldKey(field)) continue;
    markField(fieldIssues, field, "required");
  }

  return fieldIssues;
}
