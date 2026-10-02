import { apiEnvelope, patientProfile, patientVisualQaAuth } from "./visual-qa-patient-home-fixture.mjs";

const now = "2026-08-16T10:00:00.000Z";
const patient = {
  userId: patientVisualQaAuth.user.id,
  displayName: patientVisualQaAuth.user.displayName,
  avatarUrl: null,
  publicRoleLabel: "Patient",
};

const session = {
  id: "session-1",
  sessionCode: "VISUAL-SESSION-1",
  status: "UPCOMING",
  scheduledStartAt: "2026-08-20T10:00:00.000Z",
  scheduledEndAt: "2026-08-20T10:30:00.000Z",
  durationMinutes: 30,
  sessionMode: "VIDEO",
  practitioner: { id: "practitioner-1", displayName: "Mona Hassan", slug: "mona-hassan" },
  patient,
  actions: { canCancel: false, canPrepareRoom: false, canJoin: false, canPay: false, canReview: false },
  operational: {
    state: "UPCOMING",
    timelineBucket: "PENDING",
    reasonCode: "LIFECYCLE_STATUS",
    join: { allowed: false, reasonCode: "SESSION_TIME_WINDOW_NOT_OPEN", canPrepareRuntime: false, opensAt: null, closesAt: null },
    actions: { canJoin: false, canPrepareRuntime: false, canCancel: false, canPay: false, canReview: false, canMarkPatientNoShow: false, noShowReasonCode: null },
    room: { state: "NOT_APPLICABLE", closedAt: null },
    resolution: { required: false, finalDecision: null },
  },
  flowType: "SCHEDULED",
  expiresAt: null,
  cancelledAt: null,
  cancellationReason: null,
  completedAt: null,
  expiredAt: null,
  timezone: "Africa/Cairo",
};

function notification({ id, typeSlug, createdAt, readAt, action, primaryAction, context, payload = {} }) {
  return {
    id,
    typeSlug,
    category: "PATIENT",
    title: typeSlug.toUpperCase(),
    body: typeSlug.toUpperCase(),
    createdAt,
    readAt,
    action: action ? { type: "INTERNAL_LINK", href: action, label: "Open" } : null,
    payload,
    context,
    primaryAction,
  };
}

const populatedNotifications = [
  notification({
    id: "notification-session",
    typeSlug: "sessions.session-reminder",
    createdAt: now,
    readAt: null,
    action: "/patient/sessions/session-1",
    primaryAction: { kind: "session", id: "session-1", href: "/patient/sessions/session-1" },
    context: { practitionerName: "Mona Hassan", sessionStartAt: session.scheduledStartAt },
    payload: { sessionId: "session-1" },
  }),
  notification({
    id: "notification-payment",
    typeSlug: "payments.payment-failed",
    createdAt: "2026-08-16T09:45:00.000Z",
    readAt: null,
    action: "/patient/sessions/session-1/pay",
    primaryAction: { kind: "session", id: "session-1", href: "/patient/sessions/session-1/pay" },
    payload: { sessionId: "session-1" },
  }),
  notification({
    id: "notification-message",
    typeSlug: "messages.session-message-received",
    createdAt: "2026-08-15T16:30:00.000Z",
    readAt: "2026-08-15T16:35:00.000Z",
    action: "/patient/messages/conversation-1",
    primaryAction: { kind: "messages", id: "conversation-1", href: "/patient/messages/conversation-1" },
    context: { practitionerName: "Mona Hassan" },
    payload: { conversationId: "conversation-1", sessionId: "session-1" },
  }),
  notification({
    id: "notification-info",
    typeSlug: "account.profile-updated",
    createdAt: "2026-08-14T12:00:00.000Z",
    readAt: "2026-08-14T12:05:00.000Z",
  }),
];

const conversation = {
  conversationId: "conversation-1",
  type: "SESSION",
  status: "OPEN",
  isResolved: false,
  isReadOnly: false,
  canSend: true,
  sendDisabledReason: null,
  unreadCount: 0,
  lastActivityAt: now,
  createdAt: now,
  otherParty: { userId: "practitioner-1", displayName: "Mona Hassan", avatarUrl: null, publicRoleLabel: "Practitioner" },
  participants: [patient, { userId: "practitioner-1", displayName: "Mona Hassan", avatarUrl: null, publicRoleLabel: "Practitioner" }],
  linkedSessionId: "session-1",
  contextId: "session-1",
  subject: null,
  title: null,
  lastMessage: { id: "message-1", body: "See you soon.", sentAt: now, sender: { userId: "practitioner-1", displayName: "Mona Hassan" } },
};

export function installPatientNotificationsFixtureRoutes(page) {
  return page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const pathname = requestUrl.pathname;
    const state = new URL(page.url()).searchParams.get("notificationState") ?? "populated";

    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ userId: patient.userId, roles: ["PATIENT"], sessionId: "visual-qa-patient-session", authMethod: "access", isActive: true, isEmailVerified: true, isPhoneVerified: true, featureFlags: [] }) });
      return;
    }
    if (pathname.includes("/auth/") && pathname.endsWith("/refresh")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ ...patientVisualQaAuth, nextStep: "AUTHENTICATED", message: "Visual QA fixture" }) });
      return;
    }
    if (pathname.endsWith("/patients/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(patientProfile) });
      return;
    }
    if (pathname.endsWith("/notifications/me/unread-count")) {
      const unreadCount = state === "empty" ? 0 : populatedNotifications.filter((item) => !item.readAt).length;
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: { unreadCount } }) });
      return;
    }
    if (pathname.endsWith("/notifications/me/read-all") || pathname.match(/\/notifications\/me\/[^/]+\/read$/)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: { updatedCount: 1 } }) });
      return;
    }
    if (pathname.endsWith("/notifications/me")) {
      const items = state === "empty" ? [] : populatedNotifications;
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ items, pagination: { page: 1, limit: 20, hasNextPage: false, nextPage: null } }) });
      return;
    }
    if (pathname.endsWith("/patients/me/sessions/session-1")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: session }) });
      return;
    }
    if (pathname.endsWith("/messages/conversations/conversation-1")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: conversation }) });
      return;
    }
    if (pathname.endsWith("/messages/conversations/conversation-1/messages")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ items: [], pagination: { page: 1, limit: 25, totalItems: 0, totalPages: 1 } }) });
      return;
    }
    if (pathname.endsWith("/messages/conversations/unread-summary") || pathname.endsWith("/chat/conversations/unread-summary")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: { unreadCount: 0, totalUnreadMessages: 0, hasUnread: false, needsSupportReplyCount: 0 } }) });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: null, items: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 } }) });
  });
}
