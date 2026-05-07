import { apiClient, extractApiData } from "../../lib/api";
import type {
  ListMyNotificationDevicesResponseData,
  RegisterNotificationDeviceRequest,
  RegisterNotificationDeviceResponseData,
  RevokeNotificationDeviceRequest,
  RevokeNotificationDeviceResponseData,
} from "./types";

export async function registerNotificationDevice(
  payload: RegisterNotificationDeviceRequest,
) {
  const response = await apiClient.post(
    "/notifications/devices/register",
    payload,
  );
  return extractApiData<RegisterNotificationDeviceResponseData>(response);
}

export async function revokeNotificationDevice(
  payload: RevokeNotificationDeviceRequest,
) {
  const response = await apiClient.post(
    "/notifications/devices/revoke",
    payload,
  );
  return extractApiData<RevokeNotificationDeviceResponseData>(response);
}

export async function listMyNotificationDevices() {
  const response = await apiClient.get("/notifications/devices/me");
  return extractApiData<ListMyNotificationDevicesResponseData>(response);
}
