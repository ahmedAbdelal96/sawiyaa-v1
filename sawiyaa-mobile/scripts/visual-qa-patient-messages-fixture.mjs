import { apiEnvelope, patientProfile, patientVisualQaAuth } from "./visual-qa-patient-home-fixture.mjs";

const now = "2026-08-16T10:00:00.000Z";

function message({ id, conversationId, sender, body, sentAt }) {
  return {
    id,
    conversationId,
    sender,
    body,
    messageType: "TEXT",
    sentAt,
    status: "SENT",
    deliveredAt: null,
    readAt: null,
  };
}

const patient = {
  userId: patientVisualQaAuth.user.id,
  displayName: patientVisualQaAuth.user.displayName,
  avatarUrl: null,
  publicRoleLabel: "Patient",
};
const practitioner = {
  userId: "visual-qa-practitioner",
  displayName: "Dr. Lina Hassan",
  avatarUrl: null,
  publicRoleLabel: "Practitioner",
};
const support = {
  userId: "visual-qa-support",
  displayName: "Sawiyaa Support",
  avatarUrl: null,
  publicRoleLabel: "Support team",
};

function conversation({ id, type, otherParty, title, subject, unreadCount, lastMessage, canSend = true }) {
  return {
    id,
    conversationId: id,
    supportTicketId: type === "SUPPORT" ? `ticket-${id}` : null,
    type,
    title,
    subject: subject ?? null,
    contextLabel: `${type}_CONVERSATION`,
    contextId: type === "SESSION" ? "session-1" : `context-${id}`,
    status: "OPEN",
    isResolved: false,
    isReadOnly: !canSend,
    canSend,
    sendDisabledReason: canSend ? null : "CONVERSATION_CLOSED",
    unreadCount,
    lastMessage,
    participants: [patient, otherParty],
    otherParty,
    supportQueueState: type === "SUPPORT" ? "WAITING_FOR_USER" : null,
    createdAt: "2026-08-16T09:00:00.000Z",
    updatedAt: lastMessage?.sentAt ?? "2026-08-16T09:00:00.000Z",
    lastActivityAt: lastMessage?.sentAt ?? "2026-08-16T09:00:00.000Z",
  };
}

const sessionMessages = [
  message({
    id: "session-message-2",
    conversationId: "session-1",
    sender: practitioner,
    body: "I am looking forward to our session.",
    sentAt: now,
  }),
  message({
    id: "session-message-1",
    conversationId: "session-1",
    sender: patient,
    body: "Thank you. See you soon.",
    sentAt: "2026-08-16T09:55:00.000Z",
  }),
];
const supportMessages = [
  message({
    id: "support-message-1",
    conversationId: "support-1",
    sender: support,
    body: "How can we help you today?",
    sentAt: "2026-08-16T08:30:00.000Z",
  }),
];

const conversations = [
  conversation({
    id: "session-1",
    type: "SESSION",
    otherParty: practitioner,
    title: "SESSION_CONVERSATION",
    unreadCount: 2,
    lastMessage: sessionMessages[0],
  }),
  conversation({
    id: "support-1",
    type: "SUPPORT",
    otherParty: support,
    title: "support-1",
    subject: "Booking question",
    unreadCount: 0,
    lastMessage: supportMessages[0],
  }),
];

function session() {
  return {
    id: "session-1",
    sessionCode: "VISUAL-SESSION-1",
    status: "UPCOMING",
    scheduledStartAt: "2026-08-20T10:00:00.000Z",
    scheduledEndAt: "2026-08-20T10:30:00.000Z",
    durationMinutes: 30,
    sessionMode: "VIDEO",
    practitioner: { id: practitioner.userId, displayName: practitioner.displayName, slug: "lina-hassan" },
    patient: { id: patient.userId, displayName: patient.displayName },
    actions: { canCancel: false, canPrepareRoom: false, canJoin: false, canPay: false, canReview: false },
    chatAvailability: { canRead: true, canSend: true, readOnly: false, reason: "ALLOWED" },
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
}

export function installPatientMessagesFixtureRoutes(page) {
  return page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const pathname = requestUrl.pathname;
    const state = new URL(page.url()).searchParams.get("messagesState") ?? "populated";

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
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: { unreadCount: 0 } }) });
      return;
    }
    if (pathname.endsWith("/messages/conversations/unread-summary") || pathname.endsWith("/chat/conversations/unread-summary")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: { unreadCount: state === "empty" ? 0 : 2, needsSupportReplyCount: 0, hasUnread: state !== "empty", totalUnreadMessages: state === "empty" ? 0 : 2 } }) });
      return;
    }
    if (pathname.endsWith("/messages/conversations")) {
      const items = state === "empty" ? [] : conversations;
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ items, pagination: { page: 1, limit: 100, totalItems: items.length, totalPages: 1 } }) });
      return;
    }

    const messageListMatch = pathname.match(/\/messages\/conversations\/([^/]+)\/messages$/);
    if (messageListMatch && request.method() === "GET") {
      const items = messageListMatch[1] === "support-1" ? supportMessages : sessionMessages;
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ items, pagination: { page: 1, limit: 30, totalItems: items.length, totalPages: 1 } }) });
      return;
    }
    if (messageListMatch && request.method() === "POST") {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: { ...sessionMessages[0], id: "sent-message", body: "Message sent" } }) });
      return;
    }

    const conversationMatch = pathname.match(/\/messages\/conversations\/([^/]+)$/);
    if (conversationMatch) {
      const item = conversations.find((candidate) => candidate.conversationId === conversationMatch[1]) ?? conversations[0];
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item }) });
      return;
    }
    if (pathname.match(/\/messages\/conversations\/[^/]+\/(read|messages)$/) && request.method() === "POST") {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: { ok: true } }) });
      return;
    }
    if (pathname.endsWith("/chat/sessions/session-1/conversation")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: conversations[0], sessionId: "session-1", chatAvailability: conversations[0].chatAvailability }) });
      return;
    }
    if (pathname.endsWith("/patients/me/sessions/session-1")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: session() }) });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: null, items: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 } }) });
  });
}
