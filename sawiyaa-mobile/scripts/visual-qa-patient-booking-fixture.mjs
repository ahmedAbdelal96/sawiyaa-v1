import { apiEnvelope, patientProfile, patientVisualQaAuth } from "./visual-qa-patient-home-fixture.mjs";

const now = Date.now();
const slot = (days, hour, minute = 0) => {
  const value = new Date(now + days * 24 * 60 * 60 * 1000);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
};

export const bookingPractitioner = {
  id: "booking-specialist-1",
  slug: "mona-hassan",
  displayName: "Mona Hassan",
  professionalTitle: "CLINICAL_PSYCHOLOGIST",
  fullBio: "Support for anxiety, stress, and life transitions.",
  specialties: [],
  languages: ["ar", "en"],
  countryCode: "EG",
  currencyCode: "EGP",
  regionalPricingMode: "EGYPT_LOCAL",
  resolvedCountryIsoCode: "EG",
  yearsExperience: 8,
  pricing: { session30: { egp: 350, usd: null }, session60: { egp: 600, usd: null } },
  sessionPrice30: 350,
  sessionPrice60: 600,
  ratingSummary: { averageRating: 4.8, totalReviews: 42 },
  credentialsSummary: { totalCredentials: 2, approvedCredentials: 2 },
  isVerified: true,
  avatarUrl: null,
};

export const bookingPackagePlan = {
  item: {
    id: "booking-package-1",
    code: "BOOKING-4",
    title: "Four sessions",
    description: "A package for ongoing care.",
    sessionCount: 4,
    discountPercent: "10",
    isActive: true,
    sortOrder: 1,
    archivedAt: null,
    metadataJson: null,
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-01T09:00:00.000Z",
    counts: { purchaseCount: 0 },
  },
  quote: {
    planCode: "BOOKING-4",
    sessionCount: 4,
    discountPercent: "10",
    practitionerId: bookingPractitioner.id,
    durationMinutes: 30,
    sessionMode: "VIDEO",
    selectedCurrencyCode: "EGP",
    regionalPricingMode: "EGYPT_LOCAL",
    resolvedCountryIsoCode: "EG",
    provider: "INTERNAL_WALLET",
    selectedBaseSessionPrice: "350",
    undiscountedTotal: "1400",
    discountAmount: "140",
    patientPayableTotal: "1260",
  },
};

export const bookingSlots = [
  { startsAt: slot(2, 10), endsAt: slot(2, 10, 30), durationMinutes: 30 },
  { startsAt: slot(2, 11, 30), endsAt: slot(2, 12), durationMinutes: 30 },
  { startsAt: slot(4, 9), endsAt: slot(4, 10), durationMinutes: 60 },
  { startsAt: slot(4, 10), endsAt: slot(4, 10, 30), durationMinutes: 30 },
];

export function createBookingFixtureState() {
  return { sessionCreated: false, paymentConfirmed: false };
}

export function bookingSession(state) {
  const confirmed = state.paymentConfirmed;
  return {
    id: "booking-session-1",
    sessionCode: "hidden-from-ui",
    status: confirmed ? "UPCOMING" : "PENDING_PAYMENT",
    scheduledStartAt: bookingSlots[0].startsAt,
    scheduledEndAt: bookingSlots[0].endsAt,
    durationMinutes: 30,
    sessionMode: "VIDEO",
    practitioner: { id: bookingPractitioner.id, slug: bookingPractitioner.slug, displayName: bookingPractitioner.displayName },
    patient: { id: patientVisualQaAuth.user.id, displayName: patientVisualQaAuth.user.displayName },
    flowType: "SCHEDULED",
    expiresAt: new Date(now + 15 * 60 * 1000).toISOString(),
    cancelledAt: null,
    cancellationReason: null,
    completedAt: null,
    expiredAt: null,
    timezone: "Africa/Cairo",
    actions: { canCancel: true, canPrepareRoom: false, canJoin: false, canPay: !confirmed, canReview: false },
    chatAvailability: { canRead: false, canSend: false, readOnly: true, reason: "SESSION_NOT_STARTED" },
    operational: {
      state: confirmed ? "UPCOMING" : "PENDING_PAYMENT",
      timelineBucket: confirmed ? "ACTIONABLE" : "PENDING",
      reasonCode: "LIFECYCLE_STATUS",
      join: { allowed: false, reasonCode: "SESSION_TIME_WINDOW_NOT_OPEN", canPrepareRuntime: false, opensAt: null, closesAt: null },
      actions: { canJoin: false, canPrepareRuntime: false, canCancel: true, canPay: !confirmed, canReview: false, canMarkPatientNoShow: false, noShowReasonCode: null },
      room: { state: "NOT_APPLICABLE", closedAt: null },
      resolution: { required: false, finalDecision: null },
    },
  };
}

export function installBookingFixture(page, state) {
  return page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    const fulfill = (data) => route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(data) });

    if (path.endsWith("/auth/me")) return fulfill({ userId: patientVisualQaAuth.user.id, roles: ["PATIENT"], sessionId: "booking-visual-qa", authMethod: "access", isActive: true, isEmailVerified: true, isPhoneVerified: true, featureFlags: [] });
    if (path.includes("/auth/") && path.endsWith("/refresh")) return fulfill({ ...patientVisualQaAuth, nextStep: "AUTHENTICATED", message: "Visual QA fixture" });
    if (path.endsWith("/patients/me")) return fulfill(patientProfile);
    if (path.endsWith("/public/practitioners/mona-hassan")) return fulfill({ item: bookingPractitioner });
    if (path.endsWith("/public/practitioners/mona-hassan/package-plans")) return fulfill({ items: [bookingPackagePlan] });
    if (path.endsWith("/public/practitioners/mona-hassan/availability/windows")) return fulfill({ timezone: "Africa/Cairo", range: { from: url.searchParams.get("from"), to: url.searchParams.get("to") }, windows: bookingSlots, acceptsNormalBookings: true });
    if (path.endsWith("/public/refund-policies/session")) return fulfill({ item: { id: "refund-policy-1", key: "SESSION_DEFAULT", titleAr: "سياسة إلغاء الجلسة", titleEn: "Session cancellation policy", clauseCount: 0, clauses: [] } });
    if (path.endsWith("/patients/me/sessions") && method === "POST") { state.sessionCreated = true; return fulfill({ item: bookingSession(state) }); }
    if (path.includes("/patients/me/sessions/booking-session-1/financial-breakdown")) {
      const body = route.request().postDataJSON?.() ?? {};
      const discounted = body?.couponCode === "WELCOME10";
      return fulfill({ item: { sessionId: "booking-session-1", currency: "EGP", regionalPricingMode: "EGYPT_LOCAL", paymentProvider: "STRIPE", resolvedCountryIsoCode: "EG", grossAmount: "350", discountAmount: discounted ? "35" : "0", netPaidAmount: discounted ? "315" : "350", coupon: discounted ? { id: "coupon-1", code: "WELCOME10", discountAmount: "35", platformDiscountShareAmount: "35", practitionerDiscountShareAmount: "0" } : null } });
    }
    if (path.includes("/patients/me/sessions/booking-session-1/payments/capabilities")) return fulfill({ item: { provider: "STRIPE", checkoutFlow: "legacy", methods: [{ key: "CARD", label: "Card", type: "PROVIDER_HOSTED", enabled: true }], supportedMethods: ["CARD"], defaultMethod: "CARD", currency: "EGP", wallet: { enabled: false, availableBalance: "0", currencyCode: "EGP", canUseFullAmount: false, canUsePartialAmount: false } } });
    if (path.includes("/patients/me/sessions/booking-session-1/payments/initiate") && method === "POST") { state.paymentConfirmed = true; return fulfill({ item: { id: "payment-1", status: "CAPTURED", amount: "315", amountSubtotal: "350", amountDiscount: "35", amountTotal: "315", amountFromWallet: "0", amountFromGateway: "315", currency: "EGP", providerReference: null, provider: "STRIPE", providerMethod: "CARD", checkoutUrl: null, clientSecret: null, paymentAction: { canInitiate: false, reason: null } } }); }
    if (path.includes("/patients/me/sessions/booking-session-1/payments/reconcile-return") && method === "POST") return fulfill({ item: { status: "CAPTURED" }, reconciled: true });
    if (path.endsWith("/patients/me/sessions/booking-session-1")) return fulfill({ item: bookingSession(state) });
    if (path.endsWith("/notifications/me/unread-count")) return fulfill({ item: { unreadCount: 0 } });
    if (path.endsWith("/chat/conversations/unread-summary") || path.endsWith("/messages/conversations/unread-summary")) return fulfill({ item: { totalUnreadMessages: 0 } });
    if (path.endsWith("/users/me/next-session")) return fulfill(null);
    return fulfill({ item: null, items: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 } });
  });
}

export { apiEnvelope, patientProfile, patientVisualQaAuth };
