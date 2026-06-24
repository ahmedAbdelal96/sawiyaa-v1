import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  MySettingsNotificationPreferences,
  MySettingsResponse,
  MySettingsPreferences,
  UpdateMySettingsNotificationPreferencesRequest,
  UpdateMySettingsPreferencesRequest,
} from "../types/settings.types";

export async function getMySettings() {
  const response = await httpClient.get<ApiPayload<MySettingsResponse>>("/settings/me");
  return extractData(response.data);
}

export async function patchMySettingsPreferences(input: UpdateMySettingsPreferencesRequest) {
  const response = await httpClient.patch<ApiPayload<{ item: MySettingsPreferences }>>(
    "/settings/me/preferences",
    input,
  );
  return extractData(response.data);
}

export async function getMySettingsNotificationPreferences() {
  const response = await httpClient.get<ApiPayload<{ item: MySettingsNotificationPreferences }>>(
    "/settings/me/notification-preferences",
  );
  return extractData(response.data);
}

export async function putMySettingsNotificationPreferences(
  input: UpdateMySettingsNotificationPreferencesRequest,
) {
  const response = await httpClient.put<ApiPayload<{ item: MySettingsNotificationPreferences }>>(
    "/settings/me/notification-preferences",
    input,
  );
  return extractData(response.data);
}
