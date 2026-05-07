import { toAppError } from "@/lib/api/errors";

const TRAINING_ERROR_MAP: Record<string, string> = {
  TRAINING_NOT_FOUND: "admin.errors.notFound",
  TRAINING_SLUG_ALREADY_EXISTS: "admin.errors.slugAlreadyExists",
  TRAINING_ARCHIVED_READ_ONLY: "admin.errors.archivedReadOnly",
  TRAINING_LOCALE_REQUIRED_FOR_TRANSLATION_UPDATE: "admin.errors.localeRequired",
  TRAINING_INVALID_PUBLISH_TRANSITION: "admin.errors.invalidPublishTransition",
  TRAINING_SCHEDULE_REQUIRED_FOR_PUBLISH:
    "admin.errors.scheduleRequiredForPublish",
  TRAINING_INVALID_ARCHIVE_TRANSITION: "admin.errors.invalidArchiveTransition",
  TRAINING_SCHEDULE_NOT_FOUND: "admin.errors.scheduleNotFound",
  TRAINING_SCHEDULE_CODE_ALREADY_EXISTS: "admin.errors.scheduleCodeAlreadyExists",
  TRAINING_INVALID_SCHEDULE_STATUS_TRANSITION:
    "admin.errors.invalidScheduleTransition",
  TRAINING_ENROLLMENT_WINDOW_REQUIRED: "admin.errors.enrollmentWindowRequired",
  TRAINING_SESSION_WINDOW_REQUIRED: "admin.errors.sessionWindowRequired",
  TRAINING_INVALID_ENROLLMENT_WINDOW: "admin.errors.invalidEnrollmentWindow",
  TRAINING_INVALID_SESSION_WINDOW: "admin.errors.invalidSessionWindow",
  TRAINING_ENROLLMENT_MUST_CLOSE_BEFORE_START:
    "admin.errors.enrollmentMustCloseBeforeStart",
  TRAINING_INVALID_CAPACITY: "admin.errors.invalidCapacity",
  TRAINING_CANNOT_OPEN_PAST_SCHEDULE: "admin.errors.cannotOpenPastSchedule",
  TRAINING_INVALID_EXTERNAL_ROOM_PROVIDER:
    "admin.errors.invalidExternalRoomProvider",
  TRAINING_EXTERNAL_JOIN_URL_REQUIRED: "admin.errors.externalJoinUrlRequired",
  TRAINING_EXTERNAL_ROOM_PROVIDER_REQUIRED:
    "admin.errors.externalRoomProviderRequired",
  TRAINING_CAPACITY_BELOW_CURRENT_ENROLLMENTS:
    "admin.errors.capacityBelowCurrentEnrollments",
};

export function getAdminTrainingErrorKey(error: unknown): string {
  const appError = toAppError(error);
  if (appError.code && TRAINING_ERROR_MAP[appError.code]) {
    return TRAINING_ERROR_MAP[appError.code];
  }

  if (appError.statusCode === 404) {
    return TRAINING_ERROR_MAP.TRAINING_NOT_FOUND;
  }

  return "admin.errors.generic";
}
