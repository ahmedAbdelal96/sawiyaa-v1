import { apiClient, extractApiData } from "../../../lib/api";
import type {
  CreatePractitionerCouponRequest,
  PractitionerCouponDetailResponse,
  PractitionerCouponListParams,
  PractitionerCouponsListResponse,
  PractitionerCouponRedemptionsListParams,
  PractitionerCouponRedemptionsListResponse,
  UpdatePractitionerCouponRequest,
} from "./types";

export async function listPractitionerCoupons(
  params?: PractitionerCouponListParams,
) {
  const response = await apiClient.get("/practitioners/me/coupons", {
    params,
  });
  return extractApiData<PractitionerCouponsListResponse>(response);
}

export async function createPractitionerCoupon(
  payload: CreatePractitionerCouponRequest,
) {
  const response = await apiClient.post("/practitioners/me/coupons", payload);
  return extractApiData<PractitionerCouponDetailResponse>(response);
}

export async function getPractitionerCoupon(couponId: string) {
  const response = await apiClient.get(
    `/practitioners/me/coupons/${couponId}`,
  );
  return extractApiData<PractitionerCouponDetailResponse>(response);
}

export async function updatePractitionerCoupon(
  couponId: string,
  payload: UpdatePractitionerCouponRequest,
) {
  const response = await apiClient.patch(
    `/practitioners/me/coupons/${couponId}`,
    payload,
  );
  return extractApiData<PractitionerCouponDetailResponse>(response);
}

export async function activatePractitionerCoupon(couponId: string) {
  const response = await apiClient.patch(
    `/practitioners/me/coupons/${couponId}`,
    {
      isActive: true,
    },
  );
  return extractApiData<PractitionerCouponDetailResponse>(response);
}

export async function disablePractitionerCoupon(couponId: string) {
  const response = await apiClient.post(
    `/practitioners/me/coupons/${couponId}/disable`,
  );
  return extractApiData<PractitionerCouponDetailResponse>(response);
}

export async function listPractitionerCouponRedemptions(
  couponId: string,
  params?: PractitionerCouponRedemptionsListParams,
) {
  const response = await apiClient.get(
    `/practitioners/me/coupons/${couponId}/redemptions`,
    { params },
  );
  return extractApiData<PractitionerCouponRedemptionsListResponse>(response);
}
