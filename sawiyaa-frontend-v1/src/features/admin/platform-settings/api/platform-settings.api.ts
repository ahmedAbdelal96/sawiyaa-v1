import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  PlatformSettingHistory,
  PlatformSettingsResponse,
} from "../types/platform-settings.types";

export async function listPlatformSettings(params?: {
  search?: string;
  category?: string;
  state?: string;
}) {
  const response = await httpClient.get<ApiPayload<PlatformSettingsResponse>>(
    "/admin/platform-settings",
    { params },
  );
  return extractData(response.data);
}

export async function updatePlatformSetting(
  key: string,
  input: { value: unknown; reason: string; expectedUpdatedAt?: string | null },
) {
  const response = await httpClient.patch<
    ApiPayload<{ setting: unknown; changeLogId: string }>
  >(`/admin/platform-settings/${encodeURIComponent(key)}`, input);
  return extractData(response.data);
}

export async function resetPlatformSetting(
  key: string,
  input: { reason: string; expectedUpdatedAt?: string | null },
) {
  const response = await httpClient.patch<
    ApiPayload<{ setting: unknown; changeLogId: string | null }>
  >(`/admin/platform-settings/${encodeURIComponent(key)}/reset`, input);
  return extractData(response.data);
}

export async function getPlatformSettingHistory(key: string, page = 1) {
  const response = await httpClient.get<ApiPayload<PlatformSettingHistory>>(
    `/admin/platform-settings/${encodeURIComponent(key)}/history`,
    { params: { page, limit: 25 } },
  );
  return extractData(response.data);
}
