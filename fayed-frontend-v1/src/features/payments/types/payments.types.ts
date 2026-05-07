/**
 * Frontend types for the payments feature.
 * Derived directly from backend payment DTOs and wallet contracts.
 */

export type PaymentProvider = "STRIPE" | "PAYMOB" | "INTERNAL_WALLET";
export type PaymobCheckoutMethod = "CARD" | "WALLET";

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

/**
 * Full payment view model — shape returned by
 * POST /patients/me/sessions/:id/payments/initiate
 * GET  /patients/me/payments/:id
 */
export type PaymentItem = {
  id: string;
  sessionId: string | null;
  provider: PaymentProvider;
  status: PaymentStatus;
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
  /**
   * Only populated for hosted-checkout providers (e.g. Paymob when implemented).
   * null for Stripe Payment Intent flow.
   */
  checkoutUrl: string | null;
  /**
   * Stripe Payment Intent client_secret.
   * Used with Stripe Elements to complete the payment on the client.
   */
  clientSecret: string | null;
  paidAt: string | null;
  failedAt: string | null;
  expiredAt: string | null;
  refundedAt: string | null;
  createdAt: string;
};

/** Shape of `data` field after extractData on a single-payment response */
export type PaymentItemResponseData = {
  item: PaymentItem;
};

/** Request body for POST /patients/me/sessions/:id/payments/initiate */
export type InitiateSessionPaymentInput = {
  couponCode?: string;
  useWalletBalance?: boolean;
  paymobMethod?: PaymobCheckoutMethod;
  acceptedRefundPolicyId: string;
};

export type PaymentReconcileSessionReturnInput = {
  providerReference?: string | null;
  redirectStatus?: string | null;
  success?: boolean | null;
  pending?: boolean | null;
};

export type PaymentReconcileSessionReturnResponseData = {
  item: PaymentItem | null;
  reconciled: boolean;
};

export type SessionPaymentCapabilitiesItem = {
  provider: "PAYMOB";
  checkoutFlow: "legacy" | "intention";
  methods: Array<{
    key: string;
    label: string;
    type: string;
    enabled: boolean;
  }>;
  supportedMethods: string[];
  defaultMethod: string | null;
};

export type SessionPaymentCapabilitiesResponseData = {
  item: SessionPaymentCapabilitiesItem;
};

export type PaymentsPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

/** Shape of `data` field after extractData on the list-payments response */
export type PaymentsListResponseData = {
  items: PaymentItem[];
  pagination: PaymentsPagination;
};

export type ListPaymentsParams = {
  status?: PaymentStatus;
  page?: number;
  limit?: number;
};

export type CustomerWalletEntryType =
  | "REFUND_CREDIT"
  | "MANUAL_CREDIT"
  | "MANUAL_DEBIT"
  | "SESSION_PAYMENT_RESERVE"
  | "SESSION_PAYMENT_CAPTURE"
  | "SESSION_PAYMENT_RELEASE"
  | "REVERSAL"
  | "ADJUSTMENT";

export type CustomerWalletEntryDirection = "CREDIT" | "DEBIT";

export type CustomerWalletSummaryItem = {
  id: string;
  currencyCode: string;
  availableBalance: string;
  reservedBalance: string;
  lifetimeCredited: string;
  lifetimeDebited: string;
  lastEntryAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerWalletSummaryResponseData = {
  item: CustomerWalletSummaryItem | null;
};

export type CustomerWalletEntryItem = {
  id: string;
  entryType: CustomerWalletEntryType;
  direction: CustomerWalletEntryDirection;
  amount: string;
  currencyCode: string;
  description: string | null;
  paymentId: string | null;
  refundId: string | null;
  sessionId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  effectiveAt: string;
  createdAt: string;
};

export type CustomerWalletEntriesPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type CustomerWalletEntriesResponseData = {
  items: CustomerWalletEntryItem[];
  pagination: CustomerWalletEntriesPagination;
};

export type ListCustomerWalletEntriesParams = {
  currencyCode?: string;
  page?: number;
  limit?: number;
};
