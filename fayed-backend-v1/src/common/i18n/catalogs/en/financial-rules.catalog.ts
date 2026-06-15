export const enFinancialRulesCatalog = {
  success: {
    commissionRuleCreated: 'Commission rule created successfully.',
    commissionRulesFetched: 'Commission rules fetched successfully.',
    couponCreated: 'Coupon created successfully.',
    couponUpdated: 'Coupon updated successfully.',
    couponDisabled: 'Coupon disabled successfully.',
    couponRedemptionsFetched: 'Coupon redemptions fetched successfully.',
    couponValidated: 'Coupon validated successfully.',
    financialBreakdownCalculated:
      'Session financial breakdown calculated successfully.',
  },
  errors: {
    sessionNotFound: 'Session was not found.',
    pricingUnavailable: 'Pricing is unavailable for this session.',
    currencyUnavailable: 'Currency is unavailable for this session.',
    commissionRuleNotFound:
      'No active commission rule matched this session context.',
    commissionRuleSlugExists: 'Commission rule slug already exists.',
    invalidCommissionSplit:
      'Platform and practitioner commission rates must sum to 100%.',
    invalidDateRange: 'The provided date range is invalid.',
    couponNotFound: 'Coupon was not found.',
    couponCodeExists: 'Coupon code already exists.',
    couponSlugExists: 'Coupon slug already exists.',
    couponCodeInvalid:
      'Coupon code may contain only letters, numbers, dashes, and underscores.',
    practitionerCouponPercentageOnly:
      'Practitioner promo codes support percentage discounts only.',
    practitionerCouponDiscountTooHigh:
      'Practitioner promo code discount cannot exceed 25%.',
    practitionerCouponImmutableAfterRedemption:
      'Discount value cannot be changed after redemptions exist.',
    practitionerCouponInvalidMoney:
      'The provided discount amount is invalid.',
    couponUsageLimitBelowCurrentUsage:
      'Usage limit cannot be set below the current redemption count.',
    couponNotActive: 'Coupon is not active.',
    couponApprovalRequired: 'Coupon approval is required before usage.',
    couponNotStarted: 'Coupon has not started yet.',
    couponExpired: 'Coupon has expired.',
    couponUsageLimitReached: 'Coupon total usage limit has been reached.',
    couponPerPatientLimitReached:
      'Coupon usage limit for this patient has been reached.',
    couponScopeUnsupported:
      'This coupon scope is not supported by the current baseline.',
    couponNotApplicable: 'Coupon is not applicable to this session.',
    invalidCouponShareSplit:
      'Coupon platform and practitioner shares must sum to 100%.',
  },
} as const;
