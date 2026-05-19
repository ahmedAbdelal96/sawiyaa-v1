import type { ApiPayload } from "@/lib/api/contracts";
import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type {
  CreatePractitionerCouponPayload,
  ListPractitionerCouponsParams,
  ListPractitionerCouponRedemptionsParams,
  PractitionerCouponRedemptionsResponse,
  PractitionerCouponResponse,
  PractitionerCouponsListResponse,
  UpdatePractitionerCouponPayload,
} from "../types";

export async function listPractitionerCoupons(params?: ListPractitionerCouponsParams) {
  const response = await httpClient.get<ApiPayload<PractitionerCouponsListResponse>>(
    "/practitioners/me/coupons",
    { params },
  );
  return extractData(response.data);
}

export async function createPractitionerCoupon(payload: CreatePractitionerCouponPayload) {
  const response = await httpClient.post<ApiPayload<PractitionerCouponResponse>>(
    "/practitioners/me/coupons",
    payload,
  );
  return extractData(response.data);
}

export async function getPractitionerCoupon(id: string) {
  const response = await httpClient.get<ApiPayload<PractitionerCouponResponse>>(
    `/practitioners/me/coupons/${id}`,
  );
  return extractData(response.data);
}

export async function updatePractitionerCoupon(
  id: string,
  payload: UpdatePractitionerCouponPayload,
) {
  const response = await httpClient.patch<ApiPayload<PractitionerCouponResponse>>(
    `/practitioners/me/coupons/${id}`,
    payload,
  );
  return extractData(response.data);
}

export async function disablePractitionerCoupon(id: string) {
  const response = await httpClient.post<ApiPayload<PractitionerCouponResponse>>(
    `/practitioners/me/coupons/${id}/disable`,
  );
  return extractData(response.data);
}

export async function listPractitionerCouponRedemptions(
  id: string,
  params?: ListPractitionerCouponRedemptionsParams,
) {
  const response = await httpClient.get<ApiPayload<PractitionerCouponRedemptionsResponse>>(
    `/practitioners/me/coupons/${id}/redemptions`,
    { params },
  );
  return extractData(response.data);
}
