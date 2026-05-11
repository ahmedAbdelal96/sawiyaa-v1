// ---------------------------------------------------------------------------
// Patient Payments + Wallet — types
// Derived from backend DTOs (payment-response.dto.ts, customer-wallet-response.dto.ts)
// ---------------------------------------------------------------------------

export type PaymentProvider = "STRIPE" | "PAYMOB" | "INTERNAL_WALLET";

export type PaymobCheckoutMethod = "CARD" | "WALLET";

export type SessionPaymentCheckoutFlow = "legacy" | "intention";

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

export interface PaymentItem {
  id: string;
  sessionId: string | null;
  provider: PaymentProvider;
  status: PaymentStatus;
  /** Original base amount (pre-discount, pre-wallet) */
  amount: string;
  amountSubtotal: string;
  amountDiscount: string;
  /** Total charged to the patient */
  amountTotal: string;
  /** Portion paid from wallet */
  amountFromWallet: string;
  /** Portion paid via payment gateway */
  amountFromGateway: string;
  currency: string;
  regionalPricingMode: "EGYPT_LOCAL" | "INTERNATIONAL" | null;
  resolvedCountryIsoCode: string | null;
  providerPaymentId: string | null;
  providerReference: string | null;
  providerMethod: string | null;
  /** Present for hosted-checkout providers (Paymob). Open via Linking. */
  checkoutUrl: string | null;
  /** Present for Stripe Elements flow. Requires @stripe/stripe-react-native SDK. */
  clientSecret: string | null;
  paidAt: string | null;
  failedAt: string | null;
  expiredAt: string | null;
  refundedAt: string | null;
  createdAt: string;
}

export interface PaymentsPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaymentsListData {
  items: PaymentItem[];
  pagination: PaymentsPagination;
}

export interface InitiateSessionPaymentInput {
  couponCode?: string;
  useWalletBalance?: boolean;
  acceptedRefundPolicyId: string;
  paymobMethod?: PaymobCheckoutMethod;
  returnUrl?: string;
}

export interface SessionPaymentCapabilityMethod {
  key: string;
  label: string;
  type: string;
  enabled: boolean;
}

export interface SessionPaymentCapabilitiesItem {
  provider: PaymentProvider;
  checkoutFlow: SessionPaymentCheckoutFlow;
  methods: SessionPaymentCapabilityMethod[];
  supportedMethods: string[];
  defaultMethod: string | null;
}

export interface PaymentReconcileSessionReturnInput {
  providerReference?: string | null;
  redirectStatus?: string | null;
  success?: boolean | null;
  pending?: boolean | null;
}

export interface PaymentReconcileSessionReturnResult {
  item: PaymentItem | null;
  reconciled: boolean;
}

export interface ListPaymentsParams {
  status?: PaymentStatus;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Wallet types
// ---------------------------------------------------------------------------

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

export interface CustomerWalletSummaryItem {
  id: string;
  currencyCode: string;
  availableBalance: string;
  reservedBalance: string;
  lifetimeCredited: string;
  lifetimeDebited: string;
  lastEntryAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWalletSummaryData {
  item: CustomerWalletSummaryItem | null;
}

export interface CustomerWalletEntryItem {
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
}

export interface WalletEntriesPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface WalletEntriesData {
  items: CustomerWalletEntryItem[];
  pagination: WalletEntriesPagination;
}

export interface ListWalletEntriesParams {
  currencyCode?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Financial breakdown (POST /patients/me/sessions/:id/financial-breakdown)
// ---------------------------------------------------------------------------

export interface FinancialBreakdownCoupon {
  id: string;
  code: string;
  discountAmount: string;
  platformDiscountShareAmount: string;
  practitionerDiscountShareAmount: string;
}

export interface SessionFinancialBreakdown {
  sessionId: string;
  currency: string;
  regionalPricingMode: "EGYPT_LOCAL" | "INTERNATIONAL";
  paymentProvider: PaymentProvider;
  resolvedCountryIsoCode: string | null;
  grossAmount: string;
  discountAmount: string;
  netPaidAmount: string;
  coupon: FinancialBreakdownCoupon | null;
}
