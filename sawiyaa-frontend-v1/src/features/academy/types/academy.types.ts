export type AcademyLocale = "ar" | "en" | string;

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;

export type CourseVisibility = "PUBLIC" | "PRIVATE" | string;

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

export type AcademyEnrollmentStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CONFIRMED"
  | "PAYMENT_FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | string;

export type AcademyPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type AcademyCourseStats = {
  totalEnrollments: number;
  pendingPayments: number;
  paidEnrollments: number;
  failedPayments: number;
  confirmedEnrollments: number;
};

export type AcademyCourseLectureItem = {
  id: string;
  lectureOrder: number;
  lectureTitle: string | null;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
  createdByUser: {
    id: string;
    displayName: string | null;
  } | null;
};

export type AcademyCourseItem = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  fullDescription?: string | null;
  coverImageUrl: string | null;
  thumbnailUrl: string | null;
  priceAmountEgp: string | null;
  priceAmountUsd: string | null;
  priceAmount: string | null;
  currencyCode: string | null;
  regionalPricingMode: "EGYPT_LOCAL" | "INTERNATIONAL" | null;
  resolvedCountryIsoCode: string | null;
  startsAt: string | null;
  endsAt: string | null;
  plannedDurationDays: number | null;
  plannedLectureCount: number | null;
  lectures?: AcademyCourseLectureItem[];
  meetingUrl?: string | null;
  whatsappGroupUrl?: string | null;
  publishedAt: string | null;
  status?: CourseStatus;
  visibility?: CourseVisibility;
  archivedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  stats: AcademyCourseStats | null;
};

export type AcademyCoursesListData = {
  items: AcademyCourseItem[];
  pagination: AcademyPagination;
};

export type AcademyCourseResponse = {
  item: AcademyCourseItem;
};

export type AcademyLearner = {
  fullName: string;
  phoneNumber: string;
  whatsappNumber: string | null;
  email: string | null;
  countryCode: string | null;
  sourceLabel: string | null;
};

export type AcademyEnrollmentPayment = {
  id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: string;
  currency: string;
  checkoutUrl: string | null;
  clientSecret: string | null;
};

export type AcademyJoinAccess = {
  meetingUrl: string | null;
  whatsappGroupUrl: string | null;
};

export type AcademyEnrollmentItem = {
  id: string;
  publicAccessToken: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  enrollmentStatus: AcademyEnrollmentStatus;
  paymentStatus: PaymentStatus | null;
  registeredAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  failedAt: string | null;
  failedReason: string | null;
  notesInternal: string | null;
  learner: AcademyLearner;
  payment: AcademyEnrollmentPayment | null;
  joinAccess: AcademyJoinAccess;
};

export type AcademyEnrollmentsListData = {
  items: AcademyEnrollmentItem[];
  pagination: AcademyPagination;
};

export type AcademyEnrollmentResponse = {
  item: AcademyEnrollmentItem;
};

export type CreateAcademyEnrollmentInput = {
  fullName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  email?: string;
  sourceLabel?: string;
};

export type CreateAcademyCourseInput = {
  title: string;
  shortDescription?: string;
  fullDescription?: string;
  visibility?: CourseVisibility;
  coverImageUrl?: string;
  thumbnailUrl?: string;
  priceAmountEgp?: string;
  priceAmountUsd?: string;
  priceAmount?: string;
  currencyCode?: string;
  startsAt?: string;
  endsAt?: string;
  plannedDurationDays?: number;
  plannedLectureCount?: number;
  meetingUrl?: string;
  whatsappGroupUrl?: string;
  status?: CourseStatus;
};

export type CreateAcademyCourseLectureInput = {
  lectureOrder: number;
  lectureTitle?: string;
  startsAt: string;
  endsAt: string;
};

export type UpdateAcademyCourseInput = Partial<CreateAcademyCourseInput>;

export type ListAcademyCoursesParams = {
  page?: number;
  limit?: number;
  q?: string;
};

export type ListAdminAcademyCoursesParams = {
  page?: number;
  limit?: number;
  status?: CourseStatus;
  q?: string;
};

export type ListAdminAcademyEnrollmentsParams = {
  page?: number;
  limit?: number;
  status?: AcademyEnrollmentStatus;
  courseId?: string;
  q?: string;
};
