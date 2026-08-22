import { apiEnvelope, patientProfile, patientVisualQaAuth } from "./visual-qa-patient-home-fixture.mjs";

const baseOperational = {
  state: "UPCOMING",
  timelineBucket: "PENDING",
  reasonCode: "LIFECYCLE_STATUS",
  join: {
    allowed: false,
    reasonCode: "SESSION_TIME_WINDOW_NOT_OPEN",
    canPrepareRuntime: false,
    opensAt: "2026-08-20T09:45:00.000Z",
    closesAt: "2026-08-20T10:45:00.000Z",
  },
  actions: {
    canJoin: false,
    canPrepareRuntime: false,
    canCancel: false,
    canPay: false,
    canReview: false,
    canMarkPatientNoShow: false,
    noShowReasonCode: null,
  },
  room: { state: "NOT_APPLICABLE", closedAt: null },
  resolution: { required: false, finalDecision: null },
};

function operational(overrides = {}) {
  return {
    ...structuredClone(baseOperational),
    ...overrides,
    join: { ...baseOperational.join, ...(overrides.join ?? {}) },
    actions: { ...baseOperational.actions, ...(overrides.actions ?? {}) },
    room: { ...baseOperational.room, ...(overrides.room ?? {}) },
    resolution: { ...baseOperational.resolution, ...(overrides.resolution ?? {}) },
  };
}

export function makeSession({
  id,
  practitioner,
  status,
  start,
  timelineBucket = "PENDING",
  actions = {},
  timezone = "Africa/Cairo",
}) {
  const state = status;
  const canonicalActions = {
    canJoin: false,
    canPay: false,
    canReview: false,
    ...actions,
  };
  const canonical = operational({
    state,
    timelineBucket,
    actions: canonicalActions,
    join: canonicalActions.canJoin
      ? { allowed: true, reasonCode: null, opensAt: null }
      : undefined,
  });

  return {
    id,
    sessionCode: `VISUAL-${id}`,
    status,
    scheduledStartAt: start,
    scheduledEndAt: new Date(new Date(start).getTime() + 30 * 60 * 1000).toISOString(),
    durationMinutes: 30,
    sessionMode: "VIDEO",
    practitioner: {
      id: `practitioner-${id}`,
      slug: practitioner.toLowerCase().replaceAll(" ", "-"),
      displayName: practitioner,
    },
    patient: {
      id: patientVisualQaAuth.user.id,
      displayName: patientVisualQaAuth.user.displayName,
    },
    actions: {
      canCancel: canonicalActions.canCancel ?? false,
      canPrepareRoom: canonicalActions.canPrepareRuntime ?? false,
      canJoin: canonicalActions.canJoin,
      canPay: canonicalActions.canPay,
      canReview: canonicalActions.canReview,
    },
    chatAvailability: {
      canRead: true,
      canSend: true,
      readOnly: false,
      reason: "ALLOWED",
    },
    operational: canonical,
    flowType: "SCHEDULED",
    expiresAt: null,
    cancelledAt: status === "CANCELLED" ? start : null,
    cancellationReason: status === "CANCELLED" ? "PATIENT_REQUEST" : null,
    completedAt: status === "COMPLETED" ? start : null,
    expiredAt: status === "EXPIRED" ? start : null,
    timezone,
  };
}

export function sessionsForState(state) {
  const joinable = makeSession({
    id: "joinable",
    practitioner: "Mona Hassan",
    status: "READY_TO_JOIN",
    start: "2026-08-20T10:00:00.000Z",
    actions: { canJoin: true, canCancel: true },
  });
  const payment = makeSession({
    id: "payment",
    practitioner: "Omar Khaled",
    status: "PENDING_PAYMENT",
    start: "2026-08-20T12:00:00.000Z",
    actions: { canPay: true },
  });
  const review = makeSession({
    id: "review",
    practitioner: "Sara Adel",
    status: "AWAITING_ADMIN_RESOLUTION",
    start: "2026-08-20T14:00:00.000Z",
    actions: { canReview: true },
  });
  const future = makeSession({
    id: "future",
    practitioner: "Nour Samir",
    status: "UPCOMING",
    start: "2026-08-21T10:00:00.000Z",
  });
  const completed = makeSession({
    id: "completed",
    practitioner: "Mona Hassan",
    status: "COMPLETED",
    start: "2026-08-15T10:00:00.000Z",
    timelineBucket: "COMPLETED",
  });
  const cancelled = makeSession({
    id: "cancelled",
    practitioner: "Omar Khaled",
    status: "CANCELLED",
    start: "2026-08-12T12:00:00.000Z",
    timelineBucket: "TERMINAL",
  });

  if (state === "history") return [completed, cancelled];
  if (state === "empty-upcoming") return [completed];
  if (state === "payment") return [payment];
  if (state === "joinable") return [joinable];
  if (state === "detail-joinable") return [joinable];
  if (state === "detail-payment") return [payment];
  if (state === "detail-completed") return [completed];
  return [review, joinable, payment, future, completed, cancelled];
}

export function installPatientSessionsFixtureRoutes(page) {
  return page.route("**/api/v1/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;
    const state = new URL(page.url()).searchParams.get("sessionsState") ?? "upcoming";

    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          userId: patientVisualQaAuth.user.id,
          roles: ["PATIENT"],
          sessionId: "visual-qa-patient-session",
          authMethod: "access",
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          featureFlags: [],
        }),
      });
      return;
    }

    if (pathname.includes("/auth/") && pathname.endsWith("/refresh")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({ ...patientVisualQaAuth, nextStep: "AUTHENTICATED", message: "Visual QA fixture" }),
      });
      return;
    }

    if (pathname.endsWith("/patients/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(patientProfile) });
      return;
    }

    if (pathname.endsWith("/notifications/me/unread-count")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: { unreadCount: 0 } }) });
      return;
    }

    if (pathname.endsWith("/chat/conversations/unread-summary") || pathname.endsWith("/messages/conversations/unread-summary")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: { totalUnreadMessages: 0 } }) });
      return;
    }

    const detailMatch = pathname.match(/\/patients\/me\/sessions\/([^/]+)$/);
    if (detailMatch) {
      const item = sessionsForState(state).find((candidate) => candidate.id === detailMatch[1]) ?? sessionsForState(state)[0];
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item }) });
      return;
    }

    if (pathname.endsWith("/patients/me/sessions")) {
      const items = sessionsForState(state);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          items,
          pagination: { page: 1, limit: 20, totalItems: items.length, totalPages: 1 },
        }),
      });
      return;
    }

    if (pathname.match(/\/patients\/me\/sessions\/[^/]+\/runtime\/join$/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiEnvelope({
          item: {
            sessionId: "joinable",
            canJoin: true,
            blockedReason: null,
            availableAt: null,
            expiresAt: null,
            provider: "DAILY",
            roomName: "visual-room",
            roomUrl: "https://video.example.test/visual-room",
            joinToken: "visual-token",
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: apiEnvelope({ item: null, items: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 } }),
    });
  });
}
