import type { SessionMode, SessionStatus } from "@/features/sessions/types/sessions.types";

export type ListAdminSessionsParams = {
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest";
  query?: string;
  status?: SessionStatus;
  late?: boolean;
  practitionerId?: string;
  patientId?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  missingAttendance?: boolean;
};

export type AdminSessionsPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type AdminSessionListItem = {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: SessionMode;
  practitioner: {
    id: string;
    slug: string;
    displayName: string | null;
  };
  patient: {
    id: string;
    displayName: string | null;
  } | null;
  isDelayed: boolean;
};

export type AdminSessionsListData = {
  items: AdminSessionListItem[];
  pagination: AdminSessionsPagination;
};

export type SessionCancellationBookingType = "STANDARD" | "INSTANT";
export type SessionCancellationRefundMode = "NONE" | "PERCENTAGE";
export type RefundDestination = "ORIGINAL_METHOD" | "CUSTOMER_WALLET";

export type SessionCancellationPolicyRule = {
  id: string;
  code: string;
  displayName: string;
  priority: number;
  minHoursBeforeStart: number | null;
  maxHoursBeforeStart: number | null;
  isCancellationAllowed: boolean;
  refundMode: SessionCancellationRefundMode;
  refundPercent: string | null;
  isActive: boolean;
};

export type SessionCancellationPolicyItem = {
  id: string;
  bookingType: SessionCancellationBookingType;
  displayName: string;
  isActive: boolean;
  defaultRefundDestination: RefundDestination;
  version: number;
  rules: SessionCancellationPolicyRule[];
};

export type SessionCancellationPoliciesData = {
  items: SessionCancellationPolicyItem[];
};

export type UpdateSessionCancellationPolicyRuleInput = {
  code: string;
  displayName: string;
  priority: number;
  minHoursBeforeStart?: number | null;
  maxHoursBeforeStart?: number | null;
  isCancellationAllowed: boolean;
  refundMode: SessionCancellationRefundMode;
  refundPercent?: number | null;
  isActive: boolean;
};

export type UpdateSessionCancellationPolicyInput = {
  displayName: string;
  isActive: boolean;
  defaultRefundDestination: RefundDestination;
  rules: UpdateSessionCancellationPolicyRuleInput[];
};
