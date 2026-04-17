export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED"
  | string;

export type PaymentItem = {
  id: string;
  sessionId: string | null;
  provider: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  providerPaymentId: string | null;
  providerReference: string | null;
  checkoutUrl: string | null;
  clientSecret: string | null;
  paidAt: string | null;
  failedAt: string | null;
  expiredAt: string | null;
  refundedAt: string | null;
  createdAt: string;
};

export type PaymentItemDataResponse = {
  item: PaymentItem;
};

export type PaymentsListDataResponse = {
  items: PaymentItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export type FinancialBreakdown = {
  sessionId: string;
  paymentPurpose: string;
  currency: string;
  grossAmount: string;
  discountAmount: string;
  netPaidAmount: string;
  platformCommissionAmount: string;
  practitionerShareAmount: string;
  coupon: {
    id: string;
    code: string;
    discountAmount: string;
  } | null;
};

export type FinancialBreakdownDataResponse = {
  item: FinancialBreakdown;
};

export type CouponValidation = {
  id: string;
  code: string;
  status: string;
  discountType: string;
  discountValue: string;
  isActive: boolean;
};

export type CouponValidationDataResponse = {
  item: CouponValidation;
};
