export type TrainingLocale = "ar" | "en" | string;

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;

export type CourseVisibility = "PUBLIC" | "PRIVATE" | string;

export type CourseType = "LIVE" | "WORKSHOP" | "COURSE" | string;

export type TrainingScheduleStatus =
  | "DRAFT"
  | "OPEN_FOR_ENROLLMENT"
  | "FULL"
  | "STARTED"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED"
  | string;

export type TrainingEnrollmentAvailabilityReason =
  | "OPEN"
  | "STATUS_NOT_OPEN"
  | "NOT_OPEN_YET"
  | "WINDOW_CLOSED"
  | "SESSION_STARTED"
  | "CAPACITY_REACHED"
  | "INVALID_WINDOW"
  | string;

export type EnrollmentStatus =
  | "PENDING_PAYMENT"
  | "ACTIVE"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED"
  | "REFUNDED"
  | string;

export type EnrollmentAttendanceStatus =
  | "NOT_MARKED"
  | "ATTENDED"
  | "NO_SHOW"
  | string;

export type PaymentProvider = "STRIPE" | "PAYMOB" | string;

export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "REQUIRES_ACTION"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUND_PENDING"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | string;

export type TrainingJoinBlockedReason =
  | "ENROLLMENT_NOT_ACTIVE"
  | "SCHEDULE_NOT_JOINABLE"
  | "SCHEDULE_TIME_UNAVAILABLE"
  | "JOIN_WINDOW_NOT_OPEN"
  | "JOIN_ACCESS_NOT_CONFIGURED"
  | string;

export type TrainingsPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type TrainingSeo = {
  metaTitle: string | null;
  metaDescription: string | null;
};

export type TrainingSchedule = {
  id: string;
  scheduleCode: string;
  status: TrainingScheduleStatus;
  enrollmentOpenAt: string | null;
  enrollmentCloseAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string | null;
  maxEnrollments: number | null;
  availableSeats: number | null;
  isEnrollmentOpen: boolean;
  enrollmentAvailabilityReason: TrainingEnrollmentAvailabilityReason;
};

export type AdminTrainingSchedule = TrainingSchedule & {
  externalRoomProvider: string | null;
  externalRoomJoinUrl: string | null;
  externalRoomHostUrl: string | null;
};

export type PublicTrainingListItem = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  coverImageUrl: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  courseType: CourseType;
};

export type PublicTrainingDetails = PublicTrainingListItem & {
  fullDescription: string | null;
  seo: TrainingSeo;
  locale: string;
  schedules: TrainingSchedule[];
};

export type EnrollmentPaymentSnapshot = {
  id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: string;
  currency: string;
  checkoutUrl: string | null;
  clientSecret: string | null;
};

export type PatientTrainingEnrollmentItem = {
  id: string;
  courseId: string;
  scheduleId: string;
  enrollmentStatus: EnrollmentStatus;
  paymentStatus: string | null;
  enrolledAt: string;
  cancelledAt: string | null;
  refundedAt: string | null;
  completedAt: string | null;
  attendanceStatus: EnrollmentAttendanceStatus;
  courseTitle: string;
  scheduleCode: string;
  startsAt: string | null;
  endsAt: string | null;
  payment: EnrollmentPaymentSnapshot | null;
};

export type PatientTrainingJoinAccessItem = {
  enrollmentId: string;
  courseId: string;
  scheduleId: string;
  enrollmentStatus: EnrollmentStatus;
  scheduleStatus: TrainingScheduleStatus;
  canJoin: boolean;
  blockedReason: TrainingJoinBlockedReason | null;
  provider: string | null;
  joinUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

export type AdminTrainingItem = PublicTrainingDetails & {
  status: CourseStatus;
  visibility: CourseVisibility;
  archivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PublicTrainingsListData = {
  items: PublicTrainingListItem[];
  pagination: TrainingsPagination;
};

export type PatientTrainingEnrollmentsListData = {
  items: PatientTrainingEnrollmentItem[];
  pagination: TrainingsPagination;
};

export type AdminTrainingsListData = {
  items: AdminTrainingItem[];
  pagination: TrainingsPagination;
};

export type AdminTrainingScheduleListData = {
  items: AdminTrainingSchedule[];
};

export type PublicTrainingItemResponse = {
  item: PublicTrainingDetails;
};

export type PatientTrainingEnrollmentItemResponse = {
  item: PatientTrainingEnrollmentItem;
};

export type PatientTrainingJoinAccessItemResponse = {
  item: PatientTrainingJoinAccessItem;
};

export type AdminTrainingItemResponse = {
  item: AdminTrainingItem;
};

export type AdminTrainingScheduleItemResponse = {
  item: AdminTrainingSchedule;
};

export type ListPublicTrainingsParams = {
  page?: number;
  limit?: number;
  q?: string;
};

export type ListPatientTrainingEnrollmentsParams = {
  page?: number;
  limit?: number;
  status?: EnrollmentStatus;
};

export type ListAdminTrainingsParams = {
  page?: number;
  limit?: number;
  status?: CourseStatus;
  q?: string;
};

export type CreateTrainingEnrollmentInput = {
  couponCode?: string;
};

export type CreateAdminTrainingInput = {
  locale: TrainingLocale;
  title: string;
  slug: string;
  shortDescription?: string;
  fullDescription?: string;
  courseType: CourseType;
  visibility?: CourseVisibility;
  coverImageUrl?: string;
  thumbnailUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
};

export type UpdateAdminTrainingInput = Partial<CreateAdminTrainingInput>;

export type CreateAdminTrainingScheduleInput = {
  scheduleCode?: string;
  status?: TrainingScheduleStatus;
  enrollmentOpenAt: string;
  enrollmentCloseAt: string;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  maxEnrollmentsOverride?: number;
  waitlistEnabled?: boolean;
  externalRoomProvider?: string;
  externalRoomJoinUrl?: string;
  externalRoomHostUrl?: string;
};

export type UpdateAdminTrainingScheduleInput =
  Partial<CreateAdminTrainingScheduleInput>;
