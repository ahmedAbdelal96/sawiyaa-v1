export type SessionStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PENDING_PRACTITIONER_RESPONSE"
  | "CONFIRMED"
  | "UPCOMING"
  | "READY_TO_JOIN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "EXPIRED"
  | "REFUND_PENDING"
  | "REFUNDED";

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
  | "SESSION_RUNTIME_NOT_PREPARED";

export interface AvailabilityWindow {
  startsAt: string;
  endsAt: string;
  durationMinutes: number | null;
}

export interface PublicAvailabilityWindowsData {
  timezone: string;
  range: {
    from: string;
    to: string;
  };
  windows: AvailabilityWindow[];
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
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: SessionMode;
  practitioner: SessionPractitionerSummary;
  patient: SessionPatientSummary | null;
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

export interface CreateScheduledSessionPayload {
  practitionerSlug: string;
  scheduledStartAt: string;
  durationMinutes: 30 | 60;
  sessionMode?: SessionMode;
}

export interface CreateScheduledSessionResponse {
  item: SessionDetails;
}

export interface SessionJoinContract {
  sessionId: string;
  status: SessionStatus;
  provider: "NONE" | "DAILY";
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  roomName: string | null;
  roomUrl: string | null;
  joinToken: string | null;
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
  page?: number;
  limit?: number;
}
