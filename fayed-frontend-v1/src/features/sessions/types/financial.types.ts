/**
 * Financial breakdown types for session pricing.
 * Derived from backend financial-rules DTOs.
 */

export type FinancialBreakdownCoupon = {
  id: string;
  code: string;
  discountAmount: string;
  platformDiscountShareAmount: string;
  practitionerDiscountShareAmount: string;
  platformSharePercent: string;
  practitionerSharePercent: string;
};

export type FinancialBreakdownCommission = {
  id: string;
  slug: string;
  platformRatePercent: string;
  practitionerRatePercent: string;
};

export type FinancialBreakdown = {
  sessionId: string;
  paymentPurpose: string;
  currency: string;
  /** Gross price before any discount */
  grossAmount: string;
  /** Discount applied (0 if no coupon) */
  discountAmount: string;
  /** Final amount the patient pays */
  netPaidAmount: string;
  platformCommissionAmount: string;
  practitionerShareAmount: string;
  commissionRule: FinancialBreakdownCommission;
  coupon: FinancialBreakdownCoupon | null;
};

export type FinancialBreakdownResponseData = {
  item: FinancialBreakdown;
};
