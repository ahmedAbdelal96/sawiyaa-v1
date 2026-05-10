import type { SessionMode } from "../sessions/types";

export type PackagePlanSessionQuote = {
  planCode: string;
  sessionCount: number;
  discountPercent: string;
  practitionerId: string;
  durationMinutes: number;
  sessionMode: SessionMode;
  selectedCurrencyCode: string;
  selectedBaseSessionPrice: string;
  undiscountedTotal: string;
  discountAmount: string;
  patientPayableTotal: string;
};

export type PackagePlanSummary = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  sessionCount: number;
  discountPercent: string;
  isActive: boolean;
  sortOrder: number;
  archivedAt: string | null;
  metadataJson: unknown;
  createdAt: string;
  updatedAt: string;
  counts: {
    purchaseCount: number;
  };
};

export type PackagePlanQuotedItem = {
  item: PackagePlanSummary;
  quote: PackagePlanSessionQuote;
};

export type PublicPackagePlansResponseData = {
  items: PackagePlanQuotedItem[];
};

export type PackagePlansQuery = {
  durationMinutes?: 30 | 60;
  sessionMode?: SessionMode;
  currencyCode?: string;
};

export type PatientPackagePlanQuoteRequest = {
  packagePlanCode: string;
  practitionerSlug: string;
  durationMinutes: 30 | 60;
  sessionMode: SessionMode;
  currencyCode: string;
};

export type PatientPackagePlanQuoteResponseData = {
  item: PackagePlanQuotedItem;
};

export type PackagePurchaseSessionSlot = {
  scheduledStartAt: string;
};

export type ListMyPackagePurchasesParams = {
  page?: number;
  limit?: number;
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
  status:
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
  sessionCount: number;
  discountPercent: string;
  practitionerId: string;
  durationMinutes: number;
  sessionMode: SessionMode;
  selectedCurrencyCode: string;
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
  selectedCurrencyCode: string;
  selectedSessionSlots: PackagePurchaseSessionSlot[];
};

export type InitiatePatientPackagePurchasePaymentInput = {
  acceptedRefundPolicyId: string;
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

export type PackagePurchasePaymentResponseData = {
  item: {
    id: string;
    sessionId: string | null;
    provider: "STRIPE" | "PAYMOB" | "INTERNAL_WALLET";
    status:
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
    amount: string;
    amountSubtotal: string;
    amountDiscount: string;
    amountTotal: string;
    amountFromWallet: string;
    amountFromGateway: string;
    currency: string;
    providerPaymentId: string | null;
    providerReference: string | null;
    providerMethod: string | null;
    checkoutUrl: string | null;
    clientSecret: string | null;
    paidAt: string | null;
    failedAt: string | null;
    expiredAt: string | null;
    refundedAt: string | null;
    createdAt: string;
  };
};
