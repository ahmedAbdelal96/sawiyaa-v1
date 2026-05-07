import { toAppError } from "@/lib/api/errors";

const ACADEMY_ERROR_MAP: Record<string, string> = {
  ACADEMY_COURSE_NOT_FOUND: "admin.errors.notFound",
  ACADEMY_COURSE_ARCHIVED_READ_ONLY: "admin.errors.archivedReadOnly",
  ACADEMY_MISSING_PRICING: "admin.errors.missingPricing",
  ACADEMY_UNSUPPORTED_CURRENCY: "admin.errors.unsupportedCurrency",
  ACADEMY_INVALID_PUBLISH_TRANSITION: "admin.errors.invalidPublishTransition",
  ACADEMY_INVALID_ARCHIVE_TRANSITION: "admin.errors.invalidArchiveTransition",
  ACADEMY_MISSING_PLAN: "admin.errors.missingPlan",
  ACADEMY_INVALID_PLAN_WINDOW: "admin.errors.invalidPlanWindow",
  ACADEMY_INVALID_DURATION: "admin.errors.invalidDuration",
  ACADEMY_INVALID_LECTURE_COUNT: "admin.errors.invalidLectureCount",
  ACADEMY_MISSING_LECTURE_SCHEDULE: "admin.errors.missingLectureSchedule",
  ACADEMY_MISSING_LECTURE_PLAN: "admin.errors.missingLecturePlan",
  ACADEMY_INVALID_LECTURE_WINDOW: "admin.errors.invalidLectureWindow",
  ACADEMY_LECTURE_LIMIT_REACHED: "admin.errors.lectureLimitReached",
  ACADEMY_LECTURE_ORDER_TAKEN: "admin.errors.lectureOrderTaken",
};

export function getAdminAcademyErrorKey(error: unknown): string {
  const appError = toAppError(error);

  if (appError.code && ACADEMY_ERROR_MAP[appError.code]) {
    return ACADEMY_ERROR_MAP[appError.code];
  }

  if (appError.statusCode === 404) {
    return ACADEMY_ERROR_MAP.ACADEMY_COURSE_NOT_FOUND;
  }

  return "admin.errors.generic";
}
