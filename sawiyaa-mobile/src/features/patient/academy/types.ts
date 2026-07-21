export type AcademyLocale = "ar" | "en" | string;
export type AcademyProgramStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;
export type AcademyProgramDeliveryMethod = "ZOOM" | "GOOGLE_MEET" | "WHATSAPP" | "OFFLINE" | "OTHER" | string;
export type PaymentProvider = "STRIPE" | "PAYMOB" | string;
export type PaymentStatus = "CREATED" | "PENDING" | "REQUIRES_ACTION" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUND_PENDING" | "PARTIALLY_REFUNDED" | "REFUNDED" | string;
export type AcademyProgramEnrollmentStatus = "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | string;

export type AcademyPagination = { page: number; limit: number; totalItems: number; totalPages: number };
export type AcademyProgramSession = {
  id: string; programId: string; titleAr: string; titleEn: string; title: string;
  descriptionAr: string | null; descriptionEn: string | null; description: string | null;
  startsAt: string; endsAt: string; deliveryMethod: AcademyProgramDeliveryMethod;
  sortOrder: number; isPublished: boolean; publishedAt: string | null;
};
export type AcademyProgramItem = {
  id: string; slug: string; titleAr: string; titleEn: string; title: string;
  descriptionAr: string | null; descriptionEn: string | null; description: string | null;
  coverImageUrl: string | null;
  category: { id: string; slug: string; title: string } | null;
  /** Selected request-region price. Patient UI must never select raw regional values. */
  priceStatus?: "PAID" | "UNAVAILABLE" | string | null;
  pricingStatus?: "PAID" | "UNAVAILABLE" | string | null;
  priceAmount?: string | null;
  currencyCode?: "EGP" | "USD" | null;
  registrationOpen: boolean;
  maxSeats: number | null; targetLearnerCount: number | null; activeLearnerCount: number;
  remainingTargetSlots: number | null; isOverTargetLearners: boolean;
  startAt: string | null; endAt: string | null; publishedAt: string | null;
  sessions?: AcademyProgramSession[];
};
export type AcademyProgramsListData = { items: AcademyProgramItem[]; pagination: AcademyPagination };
export type AcademyProgramResponse = { item: AcademyProgramItem };
export type AcademyLearner = { id: string; fullName: string; phoneNumber: string; whatsappNumber: string | null; email: string | null; countryCode: string | null; sourceLabel: string | null };
export type AcademyProgramEnrollmentPayment = {
  id: string; provider: PaymentProvider; status: PaymentStatus; amountSubtotal: string;
  amountDiscount: string; amountTotal: string; currencyCode: string;
  checkoutUrl: string | null; clientSecret: string | null;
};
export type AcademyProgramEnrollmentItem = {
  id: string; publicAccessToken: string; userId: string | null;
  status: AcademyProgramEnrollmentStatus; paymentStatus: PaymentStatus; registeredAt: string;
  confirmedAt: string | null; cancelledAt: string | null; expiredAt: string | null; completedAt: string | null;
  selectedCurrencyCode: string; selectedAmountSnapshot: string; program: AcademyProgramItem;
  learner: AcademyLearner; payment: AcademyProgramEnrollmentPayment | null;
  joinAccess: { canAccessSession: boolean; canAccessGroup: boolean; accessLockedReason: string | null; meetingUrl: string | null; whatsappGroupUrl: string | null };
  attendanceSummary?: { totalSessions: number; attendedSessions: number; absentSessions: number; unmarkedSessions: number; attendancePercentage: number } | null;
  certificate?: { status: string; issuedAt: string | null; uploadedAt: string | null; fileName: string | null; downloadAvailable: boolean } | null;
};
export type AcademyProgramEnrollmentResponse = { item: AcademyProgramEnrollmentItem };
export type CreateAcademyProgramEnrollmentInput = { fullName: string; phoneNumber: string; whatsappNumber?: string; email?: string; sourceLabel?: string; declaredCountryCode?: string; returnUrlBase?: string };
export type ListAcademyProgramsParams = { page?: number; limit?: number; q?: string };
