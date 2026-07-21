import type { SessionMode, SessionStatus } from "@/features/sessions/types/sessions.types";
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
    completedSessions: number;
    remainingSessions: number;
    scheduledSessions: number;
    progressPercent: number;
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
};

export type CreatePatientPackagePurchaseRequest = {
  packagePlanCode: string;
  practitionerSlug: string;
  durationMinutes: 30 | 60;
  sessionMode: SessionMode;
  selectedSessionSlots: PackagePurchaseSessionSlot[];
};

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
