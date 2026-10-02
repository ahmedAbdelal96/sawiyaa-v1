const weekStartDate = "2026-08-16";
const weekEndDate = "2026-08-22";
const weekId = "visual-qa-practitioner-week";
const timezone = "Asia/Riyadh";

const slot = (id, dayOfWeek, startMinuteOfDay, durationMinutes, state = "available") => ({
  id,
  dayOfWeek,
  startMinuteOfDay,
  endMinuteOfDay: startMinuteOfDay + durationMinutes,
  durationMinutes,
  timezone,
  canEdit: state === "available",
  canRemove: state === "available",
  isPast: false,
  isBookedOrReserved: state === "booked",
  reasonCode: state === "booked" ? "BOOKED" : state === "protected" ? "ARCHIVED" : undefined,
});

// Sunday is the selected day in the visual runner. The protected/booked
// boundary is intentional fixture data for visual state coverage only.
const slots = [
  slot("sun-0900", 0, 540, 30),
  slot("sun-0930", 0, 570, 30),
  slot("sun-1000", 0, 600, 30, "booked"),
  slot("sun-1030", 0, 630, 30, "protected"),
  slot("sun-1600", 0, 960, 30),
  slot("sun-1630", 0, 990, 30),
  slot("sun-1700", 0, 1020, 30),
  slot("sun-1730", 0, 1050, 30),
  slot("mon-0900-60", 1, 540, 60),
  slot("mon-1000-60", 1, 600, 60),
];

export const visualQaAuth = {
  role: "practitioner",
  user: {
    id: "visual-qa-practitioner",
    displayName: "Visual QA Practitioner",
    status: "ACTIVE",
    roles: ["PRACTITIONER"],
    primaryEmail: "visual-qa-practitioner@example.test",
    isEmailVerified: true,
    primaryPhone: null,
    isPhoneVerified: true,
    practitionerProfileId: "visual-qa-practitioner-profile",
    practitionerStatus: "APPROVED",
  },
  tokens: {
    accessToken: "visual-qa-access-token",
    refreshToken: "visual-qa-refresh-token",
    accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
    refreshTokenExpiresAt: "2099-01-02T00:00:00.000Z",
  },
};

export const availabilityWeeks = {
  timezone,
  weekStartsOn: "SUNDAY",
  futureWeeksAllowed: 4,
  activeRange: { startWeekDate: weekStartDate, endWeekDate: "2026-09-19" },
  weeks: [
    {
      weekId,
      weekStartDate,
      weekEndDate,
      status: "PUBLISHED",
      isCurrentWeek: true,
      relativeWeekIndex: 0,
      canCreate: false,
      canEdit: true,
      canPublish: false,
      containsBookings: true,
      slotCount: slots.length,
      slotCount30Minutes: slots.filter((item) => item.durationMinutes === 30).length,
      slotCount60Minutes: slots.filter((item) => item.durationMinutes === 60).length,
      copiedFromWeekId: null,
    },
    {
      weekId: null,
      weekStartDate: "2026-08-23",
      weekEndDate: "2026-08-29",
      status: "NOT_SET",
      isCurrentWeek: false,
      relativeWeekIndex: 1,
      canCreate: true,
      canEdit: false,
      canPublish: false,
      containsBookings: false,
      slotCount: 0,
      slotCount30Minutes: 0,
      slotCount60Minutes: 0,
      copiedFromWeekId: null,
    },
    {
      weekId: "visual-qa-conflict-week",
      weekStartDate: "2026-08-30",
      weekEndDate: "2026-09-05",
      status: "DRAFT",
      isCurrentWeek: false,
      relativeWeekIndex: 2,
      canCreate: false,
      canEdit: true,
      canPublish: false,
      containsBookings: true,
      slotCount: 2,
      slotCount30Minutes: 2,
      slotCount60Minutes: 0,
      copiedFromWeekId: null,
    },
    {
      weekId: "visual-qa-protected-week",
      weekStartDate: "2026-09-06",
      weekEndDate: "2026-09-12",
      status: "PUBLISHED",
      isCurrentWeek: false,
      relativeWeekIndex: 3,
      canCreate: false,
      canEdit: false,
      canPublish: false,
      containsBookings: false,
      slotCount: 2,
      slotCount30Minutes: 2,
      slotCount60Minutes: 0,
      copiedFromWeekId: null,
    },
    {
      weekId: null,
      weekStartDate: "2026-09-13",
      weekEndDate: "2026-09-19",
      status: "NOT_SET",
      isCurrentWeek: false,
      relativeWeekIndex: 4,
      canCreate: true,
      canEdit: false,
      canPublish: false,
      containsBookings: false,
      slotCount: 0,
      slotCount30Minutes: 0,
      slotCount60Minutes: 0,
      copiedFromWeekId: null,
    },
  ],
};

export const availabilityDetails = {
  message: "Visual QA fixture",
  week: {
    id: weekId,
    weekStartDate,
    weekEndDate,
    timezone,
    status: "PUBLISHED",
    copiedFromWeekId: null,
    publishedAt: "2026-08-15T12:00:00.000Z",
    archivedAt: null,
    createdAt: "2026-08-15T12:00:00.000Z",
    updatedAt: "2026-08-15T12:00:00.000Z",
    isEditable: true,
    hasSlots: true,
    slots,
  },
  canPublish: false,
  containsBookings: true,
  slotCount30Minutes: slots.filter((item) => item.durationMinutes === 30).length,
  slotCount60Minutes: slots.filter((item) => item.durationMinutes === 60).length,
};

const sessionOperational = ({
  state = "UPCOMING",
  timelineBucket = "PENDING",
  joinAllowed = false,
  canPrepareRuntime = false,
  canReview = false,
  resolutionRequired = false,
} = {}) => ({
  state,
  timelineBucket,
  reasonCode: resolutionRequired ? "ADMIN_RESOLUTION_REQUIRED" : "LIFECYCLE_STATUS",
  join: {
    allowed: joinAllowed,
    reasonCode: joinAllowed ? null : "SESSION_TIME_WINDOW_NOT_OPEN",
    canPrepareRuntime,
    opensAt: null,
    closesAt: null,
  },
  actions: {
    canJoin: joinAllowed,
    canPrepareRuntime,
    canCancel: false,
    canPay: false,
    canReview,
    canMarkPatientNoShow: false,
    noShowReasonCode: null,
  },
  room: { state: joinAllowed ? "OPEN" : "NOT_PREPARED", closedAt: null },
  resolution: {
    required: resolutionRequired,
    finalDecision: null,
  },
});

const practitionerSession = (id, scheduledStartAt, operational) => ({
  id,
  sessionCode: id,
  status: operational.state,
  scheduledStartAt,
  scheduledEndAt: null,
  durationMinutes: 30,
  sessionMode: "VIDEO",
  practitioner: {
    id: visualQaAuth.user.practitionerProfileId,
    slug: "visual-qa-practitioner",
    displayName: visualQaAuth.user.displayName,
  },
  patient: { id: `patient-${id}`, displayName: "Mona Hassan" },
  chatAvailability: {
    canRead: true,
    canSend: true,
    readOnly: false,
    reason: "ALLOWED",
  },
  operational,
});

export const practitionerProfile = {
  practitionerProfileId: visualQaAuth.user.practitionerProfileId,
  userId: visualQaAuth.user.id,
  displayName: visualQaAuth.user.displayName,
  avatarUrl: null,
  professionalTitle: null,
  bio: null,
  countryCode: "SA",
  locale: "ar",
  timezone,
  languages: ["ar", "en"],
  yearsOfExperience: 8,
  practitionerType: "COUNSELOR",
  practitionerGender: null,
  primarySpecialtyCategoryId: null,
  acceptsPackage: true,
  pricing: { session30: { egp: null, usd: null }, session60: { egp: null, usd: null } },
  instantBookingPrice30Egp: null,
  instantBookingPrice30Usd: null,
  instantBookingPrice60Egp: null,
  instantBookingPrice60Usd: null,
  payoutDestination: null,
  profileStatus: "APPROVED",
  specialties: [],
  isProfileCompleted: true,
  canSubmitApplication: false,
  applicationStatusSummary: {
    applicationId: "visual-qa-application",
    status: "APPROVED",
    submittedAt: "2026-08-01T12:00:00.000Z",
    reviewedAt: "2026-08-02T12:00:00.000Z",
    reviewedByUserId: "visual-qa-reviewer",
    reviewDecisionReason: null,
    reviewNotes: null,
  },
  credentialSummary: {
    totalCredentials: 1,
    pendingCount: 0,
    approvedCount: 1,
    rejectedCount: 0,
    expiredCount: 0,
    lastUploadedAt: "2026-08-01T12:00:00.000Z",
  },
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-08-02T12:00:00.000Z",
};

export const practitionerReadiness = {
  isProfileCompleted: true,
  canSubmitApplication: false,
  missingRequirements: [],
  checks: {
    hasDisplayName: true,
    hasProfessionalTitle: true,
    hasBio: true,
    hasCountry: true,
    hasYearsOfExperience: true,
    hasLanguage: true,
    hasSpecialty: true,
    hasCredential: true,
    hasPayoutDestination: true,
    isAccountActive: true,
    isPractitionerOtpVerified: true,
  },
};

export const practitionerFinanceWallet = {
  item: {
    currency: "EGP",
    pendingBalance: "600.00",
    availableBalance: "1250.00",
    reservedBalance: "0.00",
    totalEarned: "4800.00",
    lifetimePaidOut: "3000.00",
    lastLedgerEntryAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:05:00.000Z",
  },
};

export const practitionerFinanceLedger = [
  {
    id: "finance-entry-session-1",
    entryType: "PRACTITIONER_EARNING",
    direction: "CREDIT",
    amount: "350.00",
    currency: "EGP",
    balanceBucket: "AVAILABLE",
    paymentId: "payment-visual-1",
    sessionId: "session-joinable",
    settlementId: null,
    referenceType: "session",
    referenceId: "session-joinable",
    description: null,
    createdAt: "2026-08-16T12:00:00.000Z",
    effectiveAt: "2026-08-16T12:00:00.000Z",
  },
  {
    id: "finance-entry-transfer-1",
    entryType: "SETTLEMENT_PAYOUT",
    direction: "DEBIT",
    amount: "-1000.00",
    currency: "EGP",
    balanceBucket: "RESERVED",
    paymentId: null,
    sessionId: null,
    settlementId: "transfer-visual-1",
    referenceType: "settlement",
    referenceId: "transfer-visual-1",
    description: null,
    createdAt: "2026-08-15T10:00:00.000Z",
    effectiveAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "finance-entry-session-2",
    entryType: "PRACTITIONER_EARNING",
    direction: "CREDIT",
    amount: "350.00",
    currency: "EGP",
    balanceBucket: "PENDING",
    paymentId: "payment-visual-2",
    sessionId: "session-upcoming",
    settlementId: null,
    referenceType: "session",
    referenceId: "session-upcoming",
    description: null,
    createdAt: "2026-08-14T15:00:00.000Z",
    effectiveAt: "2026-08-14T15:00:00.000Z",
  },
  {
    id: "finance-entry-adjustment-1",
    entryType: "MANUAL_ADJUSTMENT",
    direction: "CREDIT",
    amount: "100.00",
    currency: "EGP",
    balanceBucket: "AVAILABLE",
    paymentId: null,
    sessionId: null,
    settlementId: null,
    referenceType: "manual",
    referenceId: "adjustment-visual-1",
    description: null,
    createdAt: "2026-08-12T09:00:00.000Z",
    effectiveAt: "2026-08-12T09:00:00.000Z",
  },
];

export const practitionerFinanceTransfers = [
  {
    id: "transfer-visual-1",
    batchId: "batch-visual-1",
    batchSlug: "august-2026",
    batchPeriodYear: 2026,
    batchPeriodMonth: 8,
    batchStatus: "PROCESSING",
    practitionerId: visualQaAuth.user.practitionerProfileId,
    status: "PROCESSING",
    currency: "EGP",
    amountGross: "1000.00",
    amountAdjustments: "20.00",
    amountNet: "980.00",
    payoutMethodSnapshot: null,
    externalPayoutRef: null,
    paidAt: null,
    failedAt: null,
    notes: null,
    createdAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "transfer-visual-2",
    batchId: "batch-visual-2",
    batchSlug: "july-2026",
    batchPeriodYear: 2026,
    batchPeriodMonth: 7,
    batchStatus: "PAID",
    practitionerId: visualQaAuth.user.practitionerProfileId,
    status: "PAID",
    currency: "EGP",
    amountGross: "2000.00",
    amountAdjustments: "0.00",
    amountNet: "2000.00",
    payoutMethodSnapshot: null,
    externalPayoutRef: "transfer-reference-visual-2",
    paidAt: "2026-07-31T10:00:00.000Z",
    failedAt: null,
    notes: null,
    createdAt: "2026-07-30T10:00:00.000Z",
  },
  {
    id: "transfer-visual-3",
    batchId: "batch-visual-3",
    batchSlug: "june-2026",
    batchPeriodYear: 2026,
    batchPeriodMonth: 6,
    batchStatus: "FAILED",
    practitionerId: visualQaAuth.user.practitionerProfileId,
    status: "FAILED",
    currency: "EGP",
    amountGross: "800.00",
    amountAdjustments: "0.00",
    amountNet: "800.00",
    payoutMethodSnapshot: null,
    externalPayoutRef: null,
    paidAt: null,
    failedAt: "2026-06-30T10:00:00.000Z",
    notes: "Visual QA fixture",
    createdAt: "2026-06-29T10:00:00.000Z",
  },
];

export function practitionerFinanceWalletForState(state = "finance") {
  return state === "finance-empty"
    ? { item: { ...practitionerFinanceWallet.item, availableBalance: "1250.00" } }
    : practitionerFinanceWallet;
}

export function practitionerFinanceLedgerForState(state = "finance") {
  return state === "finance-empty" ? [] : practitionerFinanceLedger;
}

export function practitionerFinanceTransfersForState(state = "finance") {
  return state === "finance-empty" ? [] : practitionerFinanceTransfers;
}

export function practitionerSessionsForState(state = "later") {
  if (state === "empty") return [];
  if (state === "sessions-empty") return [];
  if (state === "sessions-history") {
    return [
      practitionerSession(
        "session-completed",
        "2026-08-15T10:00:00.000Z",
        sessionOperational({ state: "COMPLETED", timelineBucket: "COMPLETED" }),
      ),
      practitionerSession(
        "session-cancelled",
        "2026-08-14T13:00:00.000Z",
        sessionOperational({ state: "CANCELLED", timelineBucket: "TERMINAL" }),
      ),
    ];
  }
  if (state === "sessions-action-required" || state === "session-detail-action-required") {
    return [
      practitionerSession(
        "session-action-required",
        "2026-08-16T08:00:00.000Z",
        sessionOperational({ state: "AWAITING_ADMIN_RESOLUTION", timelineBucket: "ACTIONABLE", canReview: true, resolutionRequired: true }),
      ),
      practitionerSession(
        "session-action-required-next",
        "2026-08-16T13:00:00.000Z",
        sessionOperational(),
      ),
    ];
  }
  if (state === "sessions-upcoming" || state === "session-detail-joinable") {
    return [
      practitionerSession(
        "session-joinable",
        "2026-08-16T10:00:00.000Z",
        sessionOperational({ state: "READY_TO_JOIN", timelineBucket: "ACTIONABLE", joinAllowed: true }),
      ),
      practitionerSession(
        "session-upcoming",
        "2026-08-16T13:00:00.000Z",
        sessionOperational({ canPrepareRuntime: true }),
      ),
      practitionerSession(
        "session-later",
        "2026-08-17T10:00:00.000Z",
        sessionOperational(),
      ),
    ];
  }
  if (state === "sessions-joinable") {
    return practitionerSessionsForState("sessions-upcoming");
  }
  if (state === "joinable") {
    return [
      practitionerSession(
        "home-joinable",
        "2026-08-16T10:00:00.000Z",
        sessionOperational({ state: "READY_TO_JOIN", timelineBucket: "ACTIONABLE", joinAllowed: true }),
      ),
      practitionerSession(
        "home-after-joinable",
        "2026-08-16T13:00:00.000Z",
        sessionOperational(),
      ),
    ];
  }
  if (state === "urgent") {
    return [
      practitionerSession(
        "home-urgent",
        "2026-08-16T08:00:00.000Z",
        sessionOperational({ state: "AWAITING_ADMIN_RESOLUTION", timelineBucket: "ACTIONABLE", canReview: true, resolutionRequired: true }),
      ),
      practitionerSession(
        "home-after-urgent",
        "2026-08-16T13:00:00.000Z",
        sessionOperational(),
      ),
    ];
  }
  return [
    practitionerSession("home-later", "2026-08-16T13:00:00.000Z", sessionOperational({ canPrepareRuntime: true })),
    practitionerSession("home-later-2", "2026-08-16T15:00:00.000Z", sessionOperational()),
  ];
}

export function practitionerSessionDetailsForState(id, state = "session-detail-joinable") {
  const item = practitionerSessionsForState(state).find((session) => session.id === id) ??
    practitionerSessionsForState(state)[0];
  if (!item) return null;
  return {
    ...item,
    flowType: "SCHEDULED",
    expiresAt: null,
    cancelledAt: item.operational.state === "CANCELLED" ? "2026-08-14T13:30:00.000Z" : null,
    cancellationReason: item.operational.state === "CANCELLED" ? "Visual QA fixture" : null,
    completedAt: item.operational.state === "COMPLETED" ? "2026-08-15T10:30:00.000Z" : null,
    expiredAt: null,
    timezone,
  };
}

const messageParticipant = (userId, displayName, publicRoleLabel) => ({
  userId,
  displayName,
  avatarUrl: null,
  publicRoleLabel,
});

const message = (id, conversationId, sender, body, sentAt) => ({
  id,
  conversationId,
  sender,
  body,
  messageType: "TEXT",
  sentAt,
  status: "SENT",
  deliveredAt: sentAt,
  readAt: sender.userId === visualQaAuth.user.id ? sentAt : null,
});

const practitionerConversations = [
  {
    id: "message-session-1",
    conversationId: "message-session-1",
    supportTicketId: null,
    type: "SESSION",
    title: "Internal session conversation",
    subject: null,
    contextLabel: "SESSION_CONVERSATION",
    contextId: "session-joinable",
    status: "OPEN",
    isResolved: false,
    isReadOnly: false,
    canSend: true,
    sendDisabledReason: null,
    unreadCount: 3,
    lastMessage: message(
      "message-session-1-last",
      "message-session-1",
      messageParticipant("patient-mona", "Mona Hassan", "Patient"),
      "Can we start at 4:00 PM?",
      "2026-08-16T12:00:00.000Z",
    ),
    participants: [
      { userId: visualQaAuth.user.id, publicRoleLabel: "Practitioner", identity: messageParticipant(visualQaAuth.user.id, visualQaAuth.user.displayName, "Practitioner") },
      { userId: "patient-mona", publicRoleLabel: "Patient", identity: messageParticipant("patient-mona", "Mona Hassan", "Patient") },
    ],
    otherParty: messageParticipant("patient-mona", "Mona Hassan", "Patient"),
    supportQueueState: null,
    createdAt: "2026-08-16T09:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
    lastActivityAt: "2026-08-16T12:00:00.000Z",
  },
  {
    id: "message-support-1",
    conversationId: "message-support-1",
    supportTicketId: "support-visual-1",
    type: "SUPPORT",
    title: "Internal support conversation",
    subject: "Booking question",
    contextLabel: "SUPPORT_LANE",
    contextId: "support-visual-1",
    status: "OPEN",
    isResolved: false,
    isReadOnly: false,
    canSend: true,
    sendDisabledReason: null,
    unreadCount: 0,
    lastMessage: message(
      "message-support-1-last",
      "message-support-1",
      messageParticipant("support-sara", "Sawiyaa Support", "Support team"),
      "We are checking this for you.",
      "2026-08-16T10:00:00.000Z",
    ),
    participants: [
      { userId: visualQaAuth.user.id, publicRoleLabel: "Practitioner", identity: messageParticipant(visualQaAuth.user.id, visualQaAuth.user.displayName, "Practitioner") },
      { userId: "support-sara", publicRoleLabel: "Support team", identity: messageParticipant("support-sara", "Sawiyaa Support", "Support team") },
    ],
    otherParty: messageParticipant("support-sara", "Sawiyaa Support", "Support team"),
    supportQueueState: "NEEDS_SUPPORT_REPLY",
    createdAt: "2026-08-16T08:00:00.000Z",
    updatedAt: "2026-08-16T10:00:00.000Z",
    lastActivityAt: "2026-08-16T10:00:00.000Z",
  },
  {
    id: "message-followup-1",
    conversationId: "message-followup-1",
    supportTicketId: null,
    type: "CARE",
    title: "Internal follow-up conversation",
    subject: null,
    contextLabel: "CARE_REQUEST",
    contextId: "care-visual-1",
    status: "OPEN",
    isResolved: false,
    isReadOnly: false,
    canSend: true,
    sendDisabledReason: null,
    unreadCount: 0,
    lastMessage: message(
      "message-followup-1-last",
      "message-followup-1",
      messageParticipant(visualQaAuth.user.id, visualQaAuth.user.displayName, "Practitioner"),
      "I will follow up after our next session.",
      "2026-08-15T14:00:00.000Z",
    ),
    participants: [
      { userId: visualQaAuth.user.id, publicRoleLabel: "Practitioner", identity: messageParticipant(visualQaAuth.user.id, visualQaAuth.user.displayName, "Practitioner") },
      { userId: "patient-yousef", publicRoleLabel: "Patient", identity: messageParticipant("patient-yousef", "Yousef Ali", "Patient") },
    ],
    otherParty: messageParticipant("patient-yousef", "Yousef Ali", "Patient"),
    supportQueueState: null,
    createdAt: "2026-08-15T12:00:00.000Z",
    updatedAt: "2026-08-15T14:00:00.000Z",
    lastActivityAt: "2026-08-15T14:00:00.000Z",
  },
];

export function practitionerMessageConversationsForState(state = "messages") {
  if (state === "messages-empty") return [];
  if (state === "messages-unread") return practitionerConversations;
  return practitionerConversations;
}

export function practitionerMessageConversationForId(conversationId) {
  return practitionerConversations.find((conversation) => conversation.conversationId === conversationId) ?? null;
}

export function practitionerMessagesForConversation(conversationId) {
  const sessionConversation = conversationId === "message-session-1";
  if (!sessionConversation) {
    const conversation = practitionerMessageConversationForId(conversationId);
    return conversation?.lastMessage ? [conversation.lastMessage] : [];
  }

  const patient = messageParticipant("patient-mona", "Mona Hassan", "Patient");
  const practitioner = messageParticipant(visualQaAuth.user.id, visualQaAuth.user.displayName, "Practitioner");
  return [
    message("message-session-1-3", conversationId, patient, "Can we start at 4:00 PM?", "2026-08-16T12:00:00.000Z"),
    message("message-session-1-2", conversationId, practitioner, "Yes, I will be ready for you.", "2026-08-16T11:45:00.000Z"),
    message("message-session-1-1", conversationId, patient, "Thank you for confirming.", "2026-08-15T16:20:00.000Z"),
  ];
}

export function practitionerMessageUnreadSummary(state = "messages") {
  const conversations = practitionerMessageConversationsForState(state);
  return {
    unreadCount: conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
    needsSupportReplyCount: conversations.filter((conversation) => conversation.supportQueueState === "NEEDS_SUPPORT_REPLY").length,
    hasUnread: conversations.some((conversation) => conversation.unreadCount > 0),
    totalUnreadMessages: conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
  };
}

function practitionerNotification(
  id,
  typeSlug,
  createdAt,
  readAt,
  action,
  context = {},
  primaryAction = undefined,
) {
  return {
    id,
    typeSlug,
    category: typeSlug.split(".")[0],
    title: "Fixture notification title",
    body: "Fixture notification body",
    createdAt,
    readAt,
    action,
    payload: action?.href ? { routePath: action.href } : {},
    context,
    primaryAction,
  };
}

export function practitionerNotificationsForState(state = "notifications") {
  if (state === "notifications-empty") return [];

  return [
    practitionerNotification(
      "notification-session-joinable",
      "sessions.session-join-available",
      "2026-08-16T11:30:00.000Z",
      null,
      { type: "INTERNAL_LINK", href: "/practitioner/sessions/session-joinable", label: "Open session" },
      { patientName: "Mona Hassan", sessionStartAt: "2026-08-16T12:00:00.000Z", relatedEntityId: "session-joinable" },
      { kind: "session", id: "session-joinable", href: "/practitioner/sessions/session-joinable" },
    ),
    practitionerNotification(
      "notification-session-confirmed",
      "sessions.session-confirmed-practitioner",
      "2026-08-16T09:15:00.000Z",
      "2026-08-16T09:20:00.000Z",
      { type: "INTERNAL_LINK", href: "/practitioner/sessions/session-upcoming", label: "View session" },
      { patientName: "Mona Hassan", sessionStartAt: "2026-08-18T15:00:00.000Z", relatedEntityId: "session-upcoming" },
    ),
    practitionerNotification(
      "notification-message-session",
      "messages.session-message-received",
      "2026-08-15T14:00:00.000Z",
      null,
      { type: "INTERNAL_LINK", href: "/practitioner/messages/message-session-1", label: "Open message" },
      { senderName: "Mona Hassan", relatedEntityId: "message-session-1" },
      { kind: "messages", lane: "session", id: "message-session-1", href: "/practitioner/messages/message-session-1" },
    ),
    practitionerNotification(
      "notification-schedule-reminder",
      "availability.week-ending-reminder",
      "2026-08-14T08:00:00.000Z",
      "2026-08-14T08:05:00.000Z",
      null,
    ),
  ];
}

export function practitionerNotificationPreferencesForState() {
  const items = [
    ["sessions.session-confirmed-practitioner", "IN_APP", true],
    ["sessions.session-confirmed-practitioner", "PUSH", true],
    ["sessions.session-join-available", "IN_APP", true],
    ["sessions.session-join-available", "PUSH", true],
    ["sessions.session-reminder-60", "PUSH", false],
    ["instant-booking.request-created", "IN_APP", true],
    ["messages.session-message-received", "IN_APP", true],
    ["messages.session-message-received", "EMAIL", false],
    ["messages.support-message-received", "IN_APP", true],
    ["care-chat.request-approved", "PUSH", false],
    ["availability.week-ending-reminder", "IN_APP", true],
  ].map(([typeSlug, channel, enabled]) => ({ typeSlug, channel, enabled }));

  return {
    items,
    supportedChannels: ["IN_APP", "EMAIL", "PUSH"],
    isPersisted: true,
    updatedAt: "2026-08-16T09:00:00.000Z",
  };
}

export function apiEnvelope(data) {
  return JSON.stringify({ success: true, data });
}
