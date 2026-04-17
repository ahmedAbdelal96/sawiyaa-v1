/**
 * Frontend types for the payments feature.
 * Derived directly from backend payment DTOs and view models.
 */

export type PaymentProvider = "STRIPE" | "PAYMOB";

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
  currency: string;
  providerPaymentId: string | null;
  providerReference: string | null;
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
