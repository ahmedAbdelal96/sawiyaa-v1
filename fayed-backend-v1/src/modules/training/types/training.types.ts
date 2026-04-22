import {
  ContentLocale,
  CourseScheduleStatus,
  CourseStatus,
  CourseVisibility,
  EnrollmentStatus,
} from '@prisma/client';

export const TRAINING_DEFAULT_PAGE = 1;
export const TRAINING_DEFAULT_LIMIT = 12;
export const TRAINING_ADMIN_DEFAULT_LIMIT = 20;

export const TRAINING_DEFAULT_LOCALE = ContentLocale.ar;

export const TRAINING_PUBLIC_LIST_VISIBILITIES: CourseVisibility[] = [
  CourseVisibility.PUBLIC,
];

export const TRAINING_PUBLIC_DETAIL_VISIBILITIES: CourseVisibility[] = [
  CourseVisibility.PUBLIC,
];

export const TRAINING_V1_LIFECYCLE_STATES: CourseStatus[] = [
  CourseStatus.DRAFT,
  CourseStatus.PUBLISHED,
  CourseStatus.ARCHIVED,
];

export const TRAINING_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const TRAINING_DEFAULT_TIMEZONE = 'Africa/Cairo';
export const TRAINING_EXTERNAL_ROOM_PROVIDER_ZOOM = 'ZOOM';

export const TRAINING_PUBLIC_SCHEDULE_VISIBLE_STATUSES: CourseScheduleStatus[] =
  [CourseScheduleStatus.OPEN_FOR_ENROLLMENT, CourseScheduleStatus.FULL];

export const TRAINING_ENROLLMENT_OCCUPYING_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.PENDING_PAYMENT,
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.COMPLETED,
  EnrollmentStatus.NO_SHOW,
];

export enum TrainingEnrollmentAvailabilityReason {
  OPEN = 'OPEN',
  STATUS_NOT_OPEN = 'STATUS_NOT_OPEN',
  NOT_OPEN_YET = 'NOT_OPEN_YET',
  WINDOW_CLOSED = 'WINDOW_CLOSED',
  SESSION_STARTED = 'SESSION_STARTED',
  CAPACITY_REACHED = 'CAPACITY_REACHED',
  INVALID_WINDOW = 'INVALID_WINDOW',
}

export enum TrainingJoinBlockedReason {
  ENROLLMENT_NOT_ACTIVE = 'ENROLLMENT_NOT_ACTIVE',
  SCHEDULE_NOT_JOINABLE = 'SCHEDULE_NOT_JOINABLE',
  SCHEDULE_TIME_UNAVAILABLE = 'SCHEDULE_TIME_UNAVAILABLE',
  JOIN_WINDOW_NOT_OPEN = 'JOIN_WINDOW_NOT_OPEN',
  JOIN_ACCESS_NOT_CONFIGURED = 'JOIN_ACCESS_NOT_CONFIGURED',
}
