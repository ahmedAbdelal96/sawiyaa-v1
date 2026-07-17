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

export type SessionPresentationStatus = SessionStatus;

export type SessionPresentationFilter =
  | "all"
  | "joinable"
  | "live"
  | "upcoming"
  | "finished"
  | "unavailable";

export type SessionMode = "VIDEO" | "AUDIO" | "CHAT";

export type SessionCancellationBookingType = "STANDARD" | "INSTANT";

export type SessionCancellationRefundMode = "NONE" | "PERCENTAGE";

export type RefundDestination = "ORIGINAL_METHOD" | "CUSTOMER_WALLET";

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

export interface SessionJoinAvailability {
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  availableAt: string | null;
  expiresAt: string | null;
}

export interface PatientSessionActions {
  canCancel: boolean;
  canPrepareRoom: boolean;
  canJoin: boolean;
  canPay: boolean;
  canReview: boolean;
}

export interface SessionChatAvailability {
  canRead: boolean;
  canSend: boolean;
  readOnly: boolean;
  reason: SessionChatAvailabilityReason;
}

export interface AvailabilityWindow {
  startsAt: string;
  endsAt: string;
  durationMinutes: number | null;
}

export interface BookedAvailabilitySlot {
  startsAt: string;
  endsAt: string;
  durationMinutes: number | null;
  statusType: "BOOKED" | "RESERVED";
}

export interface PublicAvailabilityWindowsData {
  timezone: string;
  range: {
    from: string;
    to: string;
  };
  windows: AvailabilityWindow[];
  bookedSlots?: BookedAvailabilitySlot[];
}

export interface SessionPractitionerSummary {
  id: string;
  slug: string;
  displayName: string | null;
}

export interface SessionPatientSummary {
  id: string;
  displayName: string | null;
}

export interface SessionListItem {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  presentationStatus: SessionPresentationStatus;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: SessionMode;
  practitioner: SessionPractitionerSummary;
  patient: SessionPatientSummary | null;
  joinAvailability: SessionJoinAvailability;
  actions: PatientSessionActions;
  chatAvailability: SessionChatAvailability;
}

export interface SessionDetails extends SessionListItem {
  flowType: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  completedAt: string | null;
  expiredAt: string | null;
  timezone: string | null;
}

export interface SessionsPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface SessionsListResponse {
  items: SessionListItem[];
  pagination: SessionsPagination;
}

export interface PatientSessionSummary {
  total: number;
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
}

export interface PatientSessionSummaryResponse {
  item: PatientSessionSummary;
}

export interface CreateScheduledSessionPayload {
  practitionerSlug: string;
  scheduledStartAt: string;
  durationMinutes: 30 | 60;
  sessionMode?: SessionMode;
}

export interface CreateScheduledSessionResponse {
  item: SessionDetails;
}

export interface SessionProviderRuntime {
  name: "NONE" | "DAILY";
  roomId: string | null;
  roomUrl: string | null;
  token: string | null;
  tokenExpiresAt: string | null;
  joinMode: "redirect_url" | "embedded" | "external_url" | null;
  payload: Record<string, unknown>;
}

export interface SessionJoinContract {
  sessionId: string;
  status: SessionStatus;
  provider: "NONE" | "DAILY";
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  availableAt: string | null;
  expiresAt: string | null;
  roomName: string | null;
  roomUrl: string | null;
  joinToken: string | null;
  providerRuntime?: SessionProviderRuntime | null;
}

export interface SessionJoinContractResponse {
  item: SessionJoinContract;
}

export interface SessionCancellationPreview {
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
  outcomeType:
    | "NO_PAYMENT"
    | "POLICY_BLOCKED"
    | "RESERVATION_RELEASE"
    | "REFUND_TO_WALLET"
    | "NO_REFUND"
    | "UNSUPPORTED_REFUND_DESTINATION"
    | "PAYMENT_STATE_NOT_REFUNDABLE";
}

export interface SessionCancellationPreviewResponse {
  item: SessionCancellationPreview;
}

export interface ListSessionsQuery {
  status?: SessionStatus;
  presentationFilter?: SessionPresentationFilter;
  page?: number;
  limit?: number;
}
