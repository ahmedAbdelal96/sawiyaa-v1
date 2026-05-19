import type { MobileSupportedRole } from "../auth/contracts";

export type NotificationDeviceProvider = "EXPO" | "FCM" | "APNS";
export type NotificationDevicePlatform = "IOS" | "ANDROID" | "WEB";
export type NotificationDeviceRole = "PATIENT" | "PRACTITIONER";

export type PushRegistrationStatus =
  | "checking"
  | "registered"
  | "permission-required"
  | "denied"
  | "not-supported"
  | "failed";

export interface RegisterNotificationDeviceRequest {
  token: string;
  provider: NotificationDeviceProvider;
  platform: NotificationDevicePlatform;
  role: NotificationDeviceRole;
  deviceId?: string;
  appVersion?: string;
  locale?: string;
  timezone?: string;
  enabled?: boolean;
}

export interface RevokeNotificationDeviceRequest {
  token?: string;
  deviceId?: string;
}

export interface NotificationDeviceItem {
  id: string;
  role: NotificationDeviceRole | null;
  provider: NotificationDeviceProvider | null;
  platform: NotificationDevicePlatform;
  deviceId: string | null;
  appVersion: string | null;
  locale: string | null;
  timezone: string | null;
  enabled: boolean;
  lastSeenAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterNotificationDeviceResponseData {
  item: NotificationDeviceItem;
}

export interface ListMyNotificationDevicesResponseData {
  items: NotificationDeviceItem[];
}

export interface RevokeNotificationDeviceResponseData {
  item: {
    revokedCount: number;
  };
}

export interface StoredPushRegistration {
  token: string;
  deviceId: string;
  role: NotificationDeviceRole;
  userId: string;
}

export type PushPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined"
  | "not-supported";

export function resolveNotificationDeviceRole(
  role: MobileSupportedRole,
): NotificationDeviceRole | null {
  if (role === "patient") {
    return "PATIENT";
  }

  if (role === "practitioner") {
    return "PRACTITIONER";
  }

  return null;
}
