import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminPackagePlanDetailResponseData,
  AdminPackagePlanListResponseData,
  AdminPackagePlanSettingsResponseData,
  AdminPackagePlanCode,
  UpdateAdminPackagePlanInput,
  UpdateAdminPackagePlanSettingsInput,
} from "../types/admin-package-plans.types";

export const ADMIN_PACKAGE_PLANS_ROUTES = {
  list: "/admin/package-plans",
  detail: (code: AdminPackagePlanCode | string) => `/admin/package-plans/${code}`,
  enable: (code: AdminPackagePlanCode | string) => `/admin/package-plans/${code}/enable`,
  disable: (code: AdminPackagePlanCode | string) => `/admin/package-plans/${code}/disable`,
  settings: "/admin/package-plans/settings",
} as const;

export async function listAdminPackagePlans(): Promise<AdminPackagePlanListResponseData> {
  const response = await httpClient.get<ApiPayload<AdminPackagePlanListResponseData>>(
    ADMIN_PACKAGE_PLANS_ROUTES.list,
  );
  return extractData(response.data);
}

export async function getAdminPackagePlan(
  code: AdminPackagePlanCode | string,
): Promise<AdminPackagePlanDetailResponseData> {
  const response = await httpClient.get<ApiPayload<AdminPackagePlanDetailResponseData>>(
    ADMIN_PACKAGE_PLANS_ROUTES.detail(code),
  );
  return extractData(response.data);
}

export async function updateAdminPackagePlan(
  code: AdminPackagePlanCode | string,
  data: UpdateAdminPackagePlanInput,
): Promise<AdminPackagePlanDetailResponseData> {
  const response = await httpClient.patch<ApiPayload<AdminPackagePlanDetailResponseData>>(
    ADMIN_PACKAGE_PLANS_ROUTES.detail(code),
    data,
  );
  return extractData(response.data);
}

export async function enableAdminPackagePlan(
  code: AdminPackagePlanCode | string,
): Promise<AdminPackagePlanDetailResponseData> {
  const response = await httpClient.post<ApiPayload<AdminPackagePlanDetailResponseData>>(
    ADMIN_PACKAGE_PLANS_ROUTES.enable(code),
    {},
  );
  return extractData(response.data);
}

export async function disableAdminPackagePlan(
  code: AdminPackagePlanCode | string,
): Promise<AdminPackagePlanDetailResponseData> {
  const response = await httpClient.post<ApiPayload<AdminPackagePlanDetailResponseData>>(
    ADMIN_PACKAGE_PLANS_ROUTES.disable(code),
    {},
  );
  return extractData(response.data);
}

export async function getAdminPackagePlanSettings(): Promise<AdminPackagePlanSettingsResponseData> {
  const response = await httpClient.get<ApiPayload<AdminPackagePlanSettingsResponseData>>(
    ADMIN_PACKAGE_PLANS_ROUTES.settings,
  );
  return extractData(response.data);
}

export async function updateAdminPackagePlanSettings(
  data: UpdateAdminPackagePlanSettingsInput,
): Promise<AdminPackagePlanSettingsResponseData> {
  const response = await httpClient.patch<ApiPayload<AdminPackagePlanSettingsResponseData>>(
    ADMIN_PACKAGE_PLANS_ROUTES.settings,
    data,
  );
  return extractData(response.data);
}
