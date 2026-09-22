import type {
  SessionMode,
  SessionOperationalInterpretation,
} from "../sessions/types";

export type PackagePlanSessionQuote = {
  planCode: string;
  sessionCount: number;
  discountPercent: string;
  practitionerId: string;
  durationMinutes: number;
  sessionMode: SessionMode;
  selectedCurrencyCode: string;
  regionalPricingMode: "EGYPT_LOCAL" | "INTERNATIONAL";
  resolvedCountryIsoCode: string | null;
  provider: "PAYMOB" | "STRIPE" | "INTERNAL_WALLET" | null;
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
};

export type PatientPackagePlanQuoteRequest = {
  packagePlanCode: string;
  practitionerSlug: string;
  durationMinutes: 30 | 60;
  sessionMode: SessionMode;
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
    | "PENDING_PRACTITIONER_CONFIRMATION"
    | "UPCOMING"
    | "READY_TO_JOIN"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "PATIENT_NO_SHOW"
    | "PRACTITIONER_NO_SHOW"
    | "BOTH_NO_SHOW"
    | "AWAITING_COMPLETION_CONFIRMATION"
    | "EXPIRED";
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
  /** Backend-owned package identity; fall back to the localized plan label when absent. */
  title?: string | null;
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
  /** @deprecated Backend selects package pricing; clients must omit this field. */
  selectedCurrencyCode?: string;
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
    regionalPricingMode: "EGYPT_LOCAL" | "INTERNATIONAL" | null;
    resolvedCountryIsoCode: string | null;
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
