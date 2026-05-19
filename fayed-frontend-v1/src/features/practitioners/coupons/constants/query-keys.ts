import type { ListPractitionerCouponsParams, ListPractitionerCouponRedemptionsParams } from "../types";

export const practitionerCouponsQueryKeys = {
  all: ["practitioner", "coupons"] as const,
  list: (params?: ListPractitionerCouponsParams) =>
    [...practitionerCouponsQueryKeys.all, "list", params ?? {}] as const,
  details: (id: string) =>
    [...practitionerCouponsQueryKeys.all, "details", id] as const,
  redemptions: (id: string, params?: ListPractitionerCouponRedemptionsParams) =>
    [...practitionerCouponsQueryKeys.all, "redemptions", id, params ?? {}] as const,
};
