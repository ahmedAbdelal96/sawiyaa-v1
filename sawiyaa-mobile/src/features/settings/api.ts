import { apiClient, extractApiData } from "../../lib/api";
import type {
  PatchSettingsPreferencesPayload,
  SettingsNotificationPreferences,
  SettingsPreferences,
  SettingsResponse,
  PutNotificationPreferencesPayload,
} from "./types";

export async function getMySettings() {
  const response = await apiClient.get("/settings/me");
  return extractApiData<SettingsResponse>(response);
}

export async function patchMySettingsPreferences(
  payload: PatchSettingsPreferencesPayload,
) {
  const response = await apiClient.patch("/settings/me/preferences", payload);
  return extractApiData<{ item: SettingsPreferences }>(response);
}

export async function getMySettingsNotificationPreferences() {
  const response = await apiClient.get("/settings/me/notification-preferences");
  return extractApiData<{ item: SettingsNotificationPreferences }>(response);
}

export async function putMySettingsNotificationPreferences(
  payload: PutNotificationPreferencesPayload,
) {
  const response = await apiClient.put(
    "/settings/me/notification-preferences",
    payload,
  );
  return extractApiData<{ item: SettingsNotificationPreferences }>(response);
}
