import type {
  SessionMode,
  SessionOperationalInterpretation,
  SessionStatus,
} from "@/features/sessions/types/sessions.types";
import type { PaymentItemResponseData } from "@/features/payments/types/payments.types";

export type PackagePurchaseSessionSlot = {
  scheduledStartAt: string;
};

export type ListMyPackagePurchasesParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};

export type PackagePurchaseStatus =
  | "PENDING_PAYMENT"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";

export type PatientPackagePurchaseSessionSummary = {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  operational: SessionOperationalInterpretation;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: SessionMode;
  packageSessionIndex: number;
};

export type PatientPackagePurchaseItem = {
  id: string;
  status: PackagePurchaseStatus;
  planCode: string;
  title?: string;
  description?: string | null;
  sessionCount: number;
  discountPercent: string;
  practitionerId: string;
  practitioner?: {
    id: string;
    publicSlug: string;
    displayName: string;
    avatarUrl: string | null;
    professionalTitle: string | null;
  };
  progress?: {
    totalSessions: number;
    consumedSessions?: number;
    completedSessions: number;
    reservedSessions: number;
    availableSessions: number;
    remainingSessions: number;
    scheduledSessions: number;
    progressPercent: number;
    nextSessionStartAt: string | null;
  };
  durationMinutes: number;
  sessionMode: SessionMode;
  selectedCurrencyCode: string;
  regionalPricingMode: "EGYPT_LOCAL" | "INTERNATIONAL";
  resolvedCountryIsoCode: string | null;
  selectedBaseSessionPrice: string;
  undiscountedTotal: string;
  discountAmount: string;
  patientPayableTotal: string;
  paymentExpiresAt: string | null;
  linkedSessionsCount: number;
  linkedSessions: {
    totalItems: number;
    items: PatientPackagePurchaseSessionSummary[];
  };
  createdAt: string;
  updatedAt: string;
  payment: {
    id: string;
    status: string;
    amountTotal: string;
    amountFromWallet: string;
    amountFromGateway: string;
    currency: string;
    initiatedAt: string;
    capturedAt: string | null;
    failedAt: string | null;
    expiredAt: string | null;
    refundedAt: string | null;
    refunds: Array<{
      id: string;
      status: string;
      destination: string;
      amount: string;
      currency: string;
      reason: string | null;
      requestedAt: string;
      processedAt: string | null;
      failedAt: string | null;
      customerWalletCreditedAt: string | null;
      sessionId: string | null;
    }>;
  } | null;
  entitlementHistory: Array<{
    id: string;
    sessionId: string;
    sessionCode: string | null;
    decisionType: string;
    reasonCode: string;
    sessionStatus: string;
    decidedAt: string;
    scheduledStartAt: string | null;
  }>;
};

export type CreatePatientPackagePurchaseRequest = {
  packagePlanCode: string;
  practitionerSlug: string;
  durationMinutes: 30 | 60;
  sessionMode: SessionMode;
  /** Optional first appointment; remaining sessions are booked later. */
  selectedSessionSlots?: PackagePurchaseSessionSlot[];
};

export type BookPatientPackageSessionRequest = PackagePurchaseSessionSlot;

export type InitiatePatientPackagePurchasePaymentInput = {
  acceptedRefundPolicyId: string;
  returnUrl?: string;
};

export type PatientPackagePurchaseItemResponseData = {
  item: PatientPackagePurchaseItem;
};

export type PatientPackagePurchaseListResponseData = {
  items: PatientPackagePurchaseItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export type PatientPackagePurchasePaymentResponseData = PaymentItemResponseData;
