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
  /** Authoritative funding quote; existing collection intents remain fixed. */
  fundingPreview?: {
    walletUsed: string;
    gatewayAmount: string;
    gatewayAmountWithoutWallet: string;
    walletAvailable: string;
    locked: boolean;
  };
  sessionId: string;
  paymentPurpose: string;
  currency: string;
  regionalPricingMode: "EGYPT_LOCAL" | "INTERNATIONAL";
  paymentProvider: "STRIPE" | "PAYMOB" | "INTERNAL_WALLET";
  resolvedCountryIsoCode: string | null;
  /** Gross price before any discount */
  grossAmount: string;
  /** Discount applied (0 if no coupon) */
  discountAmount: string;
  /** Final amount the patient pays */
  netPaidAmount: string;
  platformCommissionAmount: string | null;
  practitionerShareAmount: string | null;
  commissionRule: FinancialBreakdownCommission | null;
  coupon: FinancialBreakdownCoupon | null;
};

export type FinancialBreakdownResponseData = {
  item: FinancialBreakdown;
};
