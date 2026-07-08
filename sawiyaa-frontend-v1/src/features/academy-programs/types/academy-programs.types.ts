export type AcademyProgramLocale = "ar" | "en" | string;

export type AcademyProgramStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;

export type AcademyProgramDeliveryMethod =
  | "ZOOM"
  | "WHATSAPP"
  | "GOOGLE_MEET"
  | "OFFLINE"
  | "OTHER"
  | string;

export type AcademyProgramPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type AcademyProgramCategorySummary = {
  id: string;
  slug: string;
  titleAr: string | null;
  titleEn: string | null;
  title: string;
};

export type AcademyProgramSessionItem = {
  id: string;
  programId: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  startsAt: string;
  endsAt: string;
  deliveryMethod: AcademyProgramDeliveryMethod;
  internalDeliveryNote: string | null;
  internalDeliveryLink: string | null;
  sortOrder: number;
  isPublished: boolean;
  publishedAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AcademyProgramItem = {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  title?: string;
  description?: string | null;
  coverImageUrl: string | null;
  categoryId: string | null;
  category?: AcademyProgramCategorySummary | null;
  priceEgp: string | null;
  priceUsd: string | null;
  registrationOpen: boolean;
  maxSeats: number | null;
  startAt: string | null;
  endAt: string | null;
  status: AcademyProgramStatus;
  publishedAt: string | null;
  archivedAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  sessions?: AcademyProgramSessionItem[];
};

export type AcademyProgramEnrollmentStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED"
  | string;

export type AcademyProgramEnrollmentPaymentStatus =
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

export type AcademyProgramEnrollmentAttendanceSummary = {
  totalSessions: number;
  attendedSessions: number;
  absentSessions: number;
  unmarkedSessions: number;
  attendancePercentage: number;
};

export type AcademyProgramEnrollmentCertificate = {
  status: "NOT_ISSUED" | "ISSUED" | "REISSUED";
  issuedAt: string | null;
  uploadedAt: string | null;
  fileName: string | null;
  downloadAvailable: boolean;
};

export type AcademyProgramAttendanceStatus = "PRESENT" | "ABSENT" | "UNMARKED" | string;

export type AcademyProgramAttendanceSummary = {
  totalLearners: number;
  markedPresent: number;
  markedAbsent: number;
  unmarked: number;
  attendancePercentage: number;
};

export type AcademyProgramEnrollmentLearner = {
  id: string;
  userId: string | null;
  fullName: string;
  phoneNumber: string;
  whatsappNumber: string | null;
  email: string | null;
  countryCode: string | null;
  countryCodeDeclared: string | null;
  countryCodeSource: string | null;
  countryCodeMismatch: boolean;
  sourceLabel: string | null;
  city: string | null;
  jobTitle: string | null;
  employer: string | null;
  education: string | null;
  notes: string | null;
};

export type AcademyProgramEnrollmentItem = {
  id: string;
  publicAccessToken: string;
  userId: string | null;
  status: AcademyProgramEnrollmentStatus;
  paymentStatus: AcademyProgramEnrollmentPaymentStatus;
  registeredAt: string;
  lockedAt: string | null;
  seatReservedAt: string | null;
  seatReservationExpiresAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  completedAt: string | null;
  certificateIssuedAt: string | null;
  selectedCurrencyCode: string;
  selectedAmountSnapshot: string;
  submittedCountry: string | null;
  lockedCountry: string | null;
  lockedCountrySource: string | null;
  contactFullName: string;
  contactEmail: string | null;
  contactPhone: string;
  contactWhatsapp: string | null;
  contactCountry: string | null;
  contactNotes: string | null;
  program: AcademyProgramItem;
  learner: AcademyProgramEnrollmentLearner;
  payment:
    | {
        id: string;
        provider: string;
        status: AcademyProgramEnrollmentPaymentStatus;
        amountSubtotal?: string;
        amountDiscount?: string;
        amountTotal?: string;
        currencyCode?: string;
        checkoutUrl?: string | null;
        clientSecret?: string | null;
      }
    | null;
  attendanceSummary: AcademyProgramEnrollmentAttendanceSummary;
  certificate: AcademyProgramEnrollmentCertificate;
};

export type AcademyProgramAttendanceItem = AcademyProgramEnrollmentItem & {
  attendanceRecordId: string | null;
  attendanceStatus: AcademyProgramAttendanceStatus;
  markedAt: string | null;
  markedByUserId: string | null;
};

export type AcademyProgramAttendanceSession = AcademyProgramSessionItem;

export type AcademyProgramAttendanceResponse = {
  item: {
    program: AcademyProgramItem;
    sessions: AcademyProgramAttendanceSession[];
    selectedSessionId: string | null;
    selectedSession: AcademyProgramAttendanceSession | null;
    summary: AcademyProgramAttendanceSummary;
    items: AcademyProgramAttendanceItem[];
  };
};

export type AcademyProgramEnrollmentAttendanceSessionItem =
  AcademyProgramSessionItem & {
    attendanceRecordId: string | null;
    attendanceStatus: AcademyProgramAttendanceStatus;
    markedAt: string | null;
  };

export type AcademyProgramEnrollmentAttendanceDetail = {
  hasRecordedAttendance: boolean;
  summary: AcademyProgramEnrollmentAttendanceSummary;
  sessions: AcademyProgramEnrollmentAttendanceSessionItem[];
};

export type AcademyProgramEnrollmentsListData = {
  items: AcademyProgramEnrollmentItem[];
  pagination: AcademyProgramPagination;
};

export type AcademyProgramEnrollmentResponse = {
  item: AcademyProgramEnrollmentItem;
};

export type AcademyProgramEnrollmentDetailResponse = {
  item: AcademyProgramEnrollmentItem;
  attendance: AcademyProgramEnrollmentAttendanceDetail;
};

export type AcademyProgramResponse = {
  item: AcademyProgramItem;
};

export type AcademyProgramCoverUploadResponse = {
  url: string;
};

export type AcademyProgramsListData = {
  items: AcademyProgramItem[];
  pagination: AcademyProgramPagination;
};

export type CreateAcademyProgramInput = {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  slug?: string;
  coverImageUrl?: string;
  categoryId?: string;
  priceEgp: string;
  priceUsd: string;
  registrationOpen?: boolean;
  maxSeats?: number;
  startAt: string;
  endAt: string;
};

export type CreateAcademyProgramEnrollmentInput = {
  fullName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  email?: string;
  sourceLabel?: string;
  returnUrlBase?: string;
};

export type CreateAdminAcademyProgramEnrollmentInput = {
  fullName: string;
  phoneNumber: string;
  whatsappNumber?: string | null;
  email?: string | null;
  city?: string | null;
  jobTitle?: string | null;
  employer?: string | null;
  education?: string | null;
  notes?: string | null;
};

export type UpdateAcademyProgramInput = Partial<CreateAcademyProgramInput>;

export type CreateAcademyProgramSessionInput = {
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  startsAt: string;
  endsAt: string;
  deliveryMethod: AcademyProgramDeliveryMethod;
  internalDeliveryNote?: string;
  internalDeliveryLink?: string;
  sortOrder?: number;
  isPublished?: boolean;
};

export type UpdateAcademyProgramSessionInput = Partial<CreateAcademyProgramSessionInput>;

export type ListAdminAcademyProgramsParams = {
  page?: number;
  limit?: number;
  status?: AcademyProgramStatus;
  q?: string;
};

export type ListPublicAcademyProgramsParams = {
  page?: number;
  limit?: number;
  q?: string;
};

export type ListPatientAcademyProgramEnrollmentsParams = {
  page?: number;
  limit?: number;
};

export type ListAdminAcademyProgramEnrollmentsParams = {
  page?: number;
  limit?: number;
  status?: AcademyProgramEnrollmentStatus;
  paymentStatus?: AcademyProgramEnrollmentPaymentStatus;
  country?: string;
  q?: string;
  sortBy?: "registeredAt" | "name";
  sortDir?: "asc" | "desc";
};

export type UpdateAcademyProgramEnrollmentLearnerInput = {
  fullName?: string;
  phoneNumber?: string;
  whatsappNumber?: string | null;
  email?: string | null;
  city?: string | null;
  jobTitle?: string | null;
  employer?: string | null;
  education?: string | null;
  notes?: string | null;
};

export type UploadAcademyProgramEnrollmentCertificateInput = {
  file: File;
};

export type AcademyProgramEnrollmentBulkAction =
  | "CANCEL_ENROLLMENT"
  | "MARK_COMPLETED"
  | "MARK_CERTIFIED";

export type BulkAcademyProgramEnrollmentActionInput = {
  action: AcademyProgramEnrollmentBulkAction;
  enrollmentIds: string[];
};

export type ListAdminAcademyProgramAttendanceParams = {
  sessionId?: string;
};

export type SaveAdminAcademyProgramAttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "UNMARKED";

export type SaveAdminAcademyProgramAttendanceItemInput = {
  enrollmentId: string;
  status: SaveAdminAcademyProgramAttendanceStatus;
};

export type SaveAdminAcademyProgramAttendanceInput = {
  sessionId: string;
  items: SaveAdminAcademyProgramAttendanceItemInput[];
};
