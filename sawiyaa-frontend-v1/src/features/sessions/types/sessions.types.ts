/**
 * Frontend types for the sessions feature.
 * Derived directly from backend session DTOs and view models.
 */

export type SessionStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PENDING_PRACTITIONER_CONFIRMATION"
  | "UPCOMING"
  | "READY_TO_JOIN"
  | "IN_PROGRESS"
  | "AWAITING_COMPLETION_CONFIRMATION"
  | "COMPLETED"
  | "CANCELLED"
  | "PATIENT_NO_SHOW"
  | "PRACTITIONER_NO_SHOW"
  | "BOTH_NO_SHOW"
  | "EXPIRED";

/** Temporary API alias; it is always equal to the canonical status. */
export type SessionPresentationStatus = SessionStatus;

export type SessionPresentationFilter =
  | "all"
  | "joinable"
  | "live"
  | "upcoming"
  | "finished"
  | "unavailable";

export type SessionMode = "VIDEO";
export type SessionProvider = string;
export type SessionProviderJoinMode =
  | "redirect_url"
  | "embedded"
  | "external_url"
  | string;
export type SessionProviderRuntime = {
  name: SessionProvider;
  roomId: string | null;
  roomUrl: string | null;
  token: string | null;
  tokenExpiresAt: string | null;
  joinMode: SessionProviderJoinMode | null;
  payload: Record<string, unknown>;
};
export type SessionCancellationBookingType = "STANDARD" | "INSTANT";
export type SessionCancellationRefundMode = "NONE" | "PERCENTAGE";
export type RefundDestination = "CUSTOMER_WALLET" | "ORIGINAL_METHOD";
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
  | "REFUNDED";

export type SessionJoinBlockedReason =
  | "SESSION_NOT_JOINABLE_STATUS"
  | "SESSION_NOT_VIDEO_MODE"
  | "SESSION_TIME_WINDOW_NOT_OPEN"
  | "SESSION_RUNTIME_NOT_PREPARED"
  | "SESSION_JOIN_WINDOW_CLOSED"
  | "SESSION_ROOM_CLOSED";

export type SessionChatAvailabilityReason =
  | "ALLOWED"
  | "SESSION_NOT_STARTED"
  | "SESSION_ENDED"
  | "SESSION_CANCELLED"
  | "CONVERSATION_CLOSED"
  | "MODERATION_LOCKED"
  | "NOT_PARTICIPANT";

export type SessionJoinAvailability = {
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  availableAt: string | null;
  expiresAt: string | null;
};

export type PatientSessionActions = {
  canCancel: boolean;
  canPrepareRoom: boolean;
  canJoin: boolean;
  canPay: boolean;
  canReview: boolean;
};

export type SessionChatAvailability = {
  canRead: boolean;
  canSend: boolean;
  readOnly: boolean;
  reason: SessionChatAvailabilityReason;
};

export type SessionPractitionerSummary = {
  id: string;
  slug: string;
  displayName: string | null;
};

export type SessionPatientSummary = {
  id: string;
  displayName: string | null;
};

/**
 * Full session details view model — shape returned by POST /patients/me/sessions
 * and GET /patients/me/sessions/:id (after extractData unwraps the envelope).
 */
export type SessionItem = {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  presentationStatus: SessionPresentationStatus;
  createdAt: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: SessionMode;
  practitioner: SessionPractitionerSummary;
  patient: SessionPatientSummary | null;
  joinAvailability: SessionJoinAvailability;
  actions: PatientSessionActions;
  chatAvailability: SessionChatAvailability;
  flowType: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  completedAt: string | null;
  expiredAt: string | null;
  timezone: string | null;
  notesInternal: string | null;
  paymentCoverageType: "DIRECT_PAYMENT" | "PACKAGE" | "CORPORATE_SPONSORSHIP";
  packagePurchase: { id: string; packagePlan: { title: string } } | null;
  unreadCount?: number;
  hasUnread?: boolean;
  conversationId: string | null;
  patientDetails: {
    dateOfBirth: string | null;
    gender: string | null;
    preferredLanguage: string | null;
    country: {
      isoCode: string;
      name: string;
      nativeName: string | null;
    } | null;
  } | null;
  practitionerDetails: {
    professionalTitle: string | null;
    avatarUrl: string | null;
    specialties: Array<{
      id: string;
      nameAr: string | null;
      nameEn: string | null;
      isPrimary: boolean;
    }>;
  } | null;
  paymentDetails: {
    id: string;
    paymentPurpose: string;
    status: string;
    amountTotal: number;
    currencyCode: string;
    provider: string;
    initiatedAt: string;
  } | null;
  corporateSponsorshipDetails: {
    id: string;
    coverageType: string;
    originalAmount: number;
    coveredAmount: number;
    patientPayAmount: number;
    currency: string;
    benefitPlanName: string;
    organizationName: string;
  } | null;
  reviewDetails: {
    id: string;
    ratingValue: number;
    reviewTitle: string | null;
    reviewText: string | null;
    submittedAt: string | null;
  } | null;
  timeline: Array<{
    eventType: string;
    occurredAt: string;
    actorType: string | null;
    reason: string | null;
  }>;
};

/**
 * Payload for POST /patients/me/sessions (scheduled flow).
 * `durationMinutes` must be 30 or 60 — backend validates with @IsIn([30, 60]).
 * `scheduledStartAt` must be a future UTC ISO 8601 datetime.
 */
export type CreateScheduledSessionInput = {
  practitionerSlug: string;
  scheduledStartAt: string;
  durationMinutes: 30 | 60;
  sessionMode?: SessionMode;
};

/** Shape of `data` field after extractData on the create session response */
export type CreateSessionResponseData = {
  item: SessionItem;
};

/**
 * List item shape — returned by GET /patients/me/sessions (data.items[]).
 * Subset of SessionItem: no flowType, expiresAt, cancellation, or completion fields.
 */
export type SessionListItem = {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  presentationStatus: SessionPresentationStatus;
  createdAt: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: SessionMode;
  practitioner: SessionPractitionerSummary;
  patient: SessionPatientSummary | null;
  joinAvailability: SessionJoinAvailability;
  actions: PatientSessionActions;
  chatAvailability: SessionChatAvailability;
  unreadCount?: number;
  hasUnread?: boolean;
};

export type SessionsPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type SessionsListResponseData = {
  items: SessionListItem[];
  pagination: SessionsPagination;
};

export type SessionSummary = {
  totalItems: number;
  pendingPayment: number;
  pendingPractitionerResponse: number;
  confirmed: number;
  upcoming: number;
  readyToJoin: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
  expired: number;
  refundPending: number;
  refunded: number;
  actionRequired: number;
  active: number;
  history: number;
  paymentExpired: number;
};

export type SessionSummaryResponseData = {
  item: SessionSummary;
};

export type ListSessionsParams = {
  status?: SessionStatus;
  presentationFilter?: SessionPresentationFilter;
  query?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  page?: number;
  limit?: number;
};

export type SessionJoinItem = {
  sessionId: string;
  status: SessionStatus;
  provider: SessionProvider;
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  availableAt: string | null;
  expiresAt: string | null;
  roomName: string | null;
  roomUrl: string | null;
  joinToken: string | null;
  providerRuntime?: SessionProviderRuntime | null;
};

export type SessionJoinResponseData = {
  item: SessionJoinItem;
};

export type SessionRuntimeItem = {
  provider: SessionProvider;
  isPrepared: boolean;
  roomName: string | null;
  roomUrl: string | null;
  providerRuntime?: SessionProviderRuntime | null;
};

export type SessionRuntimeResponseData = {
  item: SessionRuntimeItem;
};

export type SessionRoomCloseItem = {
  sessionId: string;
  provider: SessionProvider;
  isClosed: boolean;
  wasAlreadyClosed: boolean;
  roomName: string | null;
  roomUrl: string | null;
  closedAt: string | null;
  closeReason: string | null;
  closeNote: string | null;
};

export type SessionRoomCloseResponseData = {
  item: SessionRoomCloseItem;
};

export type SessionCancellationPreviewOutcomeType =
  | "NO_PAYMENT"
  | "POLICY_BLOCKED"
  | "RESERVATION_RELEASE"
  | "REFUND_TO_WALLET"
  | "NO_REFUND"
  | "UNSUPPORTED_REFUND_DESTINATION"
  | "PAYMENT_STATE_NOT_REFUNDABLE";

export type SessionCancellationPreviewItem = {
  sessionId: string;
  bookingType: SessionCancellationBookingType;
  canCancelNow: boolean;
  cancellationAllowedByPolicy: boolean;
  blockingReasonCode: string | null;
  sessionStartAt: string;
  hoursBeforeStart: number;
  matchedRuleCode: string;
  matchedRuleDisplayName: string;
  refundMode: SessionCancellationRefundMode;
  refundPercent: string | null;
  refundDestination: RefundDestination | null;
  paymentStatus: PaymentStatus | null;
  paymentAmountTotal: string;
  paymentAmountFromWallet: string;
  paymentAmountFromGateway: string;
  alreadyRefundedAmount: string;
  reservationReleaseAmount: string;
  refundAmount: string;
  walletCreditAmount: string;
  gatewayRefundAmount: string;
  outcomeType: SessionCancellationPreviewOutcomeType;
};

export type SessionCancellationPreviewResponseData = {
  item: SessionCancellationPreviewItem;
};
