export const patientVisualQaAuth = {
  role: "patient",
  user: {
    id: "visual-qa-patient",
    displayName: "Salma Hassan",
    status: "ACTIVE",
    roles: ["PATIENT"],
    primaryEmail: "visual-qa-patient@example.test",
    isEmailVerified: true,
    primaryPhone: null,
    isPhoneVerified: true,
  },
  tokens: {
    accessToken: "visual-qa-patient-access-token",
    refreshToken: "visual-qa-patient-refresh-token",
    accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
    refreshTokenExpiresAt: "2099-01-02T00:00:00.000Z",
  },
};

export function apiEnvelope(data) {
  return JSON.stringify({ success: true, data });
}

export const patientProfile = {
  message: "Visual QA fixture",
  profile: {
    patientProfileId: "visual-qa-patient-profile",
    userId: patientVisualQaAuth.user.id,
    avatarUrl: null,
    avatarDataUrl: null,
    displayName: patientVisualQaAuth.user.displayName,
    dateOfBirth: null,
    gender: null,
    locale: "en",
    countryCode: "EG",
    timezone: "Africa/Cairo",
    isOnboardingCompleted: true,
    onboardingCompletedAt: "2026-08-01T09:00:00.000Z",
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-01T09:00:00.000Z",
  },
};

const baseOperational = {
  state: "UPCOMING",
  reasonCode: "LIFECYCLE_STATUS",
  join: {
    allowed: false,
    reasonCode: "SESSION_TIME_WINDOW_NOT_OPEN",
    canPrepareRuntime: false,
    opensAt: null,
    closesAt: null,
  },
  actions: {
    canJoin: false,
    canPrepareRuntime: false,
    canCancel: true,
    canPay: false,
    canReview: false,
    canMarkPatientNoShow: false,
    noShowReasonCode: null,
  },
  room: { state: "NOT_APPLICABLE", closedAt: null },
  resolution: { required: false, finalDecision: null },
};

export function nextSessionForState(state) {
  if (state === "discovery") return null;

  const operational = structuredClone(baseOperational);
  if (state === "joinable") {
    operational.state = "READY_TO_JOIN";
    operational.join.allowed = true;
    operational.join.reasonCode = null;
    operational.actions.canJoin = true;
  }
  if (state === "payment") {
    operational.state = "PENDING_PAYMENT";
    operational.actions.canPay = true;
  }

  return {
    sessionId: "visual-qa-patient-session",
    role: "PATIENT",
    counterpart: { displayName: "Mona Hassan", avatarUrl: null },
    startsAt: "2026-08-16T16:00:00.000Z",
    scheduledEndAt: "2026-08-16T16:30:00.000Z",
    durationMinutes: 30,
    displayTimezone: "Africa/Cairo",
    status: operational.state,
    detailsRoute: "/(patient)/sessions/visual-qa-patient-session",
    joinRoute: "/(patient)/sessions/visual-qa-patient-session",
    operational,
  };
}

export const emptyPatientHome = {
  currencyCode: "EGP",
  featuredPractitioners: { label: "Featured specialists", status: "READY", items: [], currencyCode: "EGP" },
  recentlyVisitedPractitioners: { label: "Recently visited", status: "READY", items: [], currencyCode: "EGP" },
  mostBookedTodayPractitioners: { label: "Popular specialists", status: "READY", items: [], currencyCode: "EGP" },
  topRatedPractitioners: { label: "Top rated", status: "READY", items: [], currencyCode: "EGP" },
  matchingCard: null,
  supportCard: null,
};
