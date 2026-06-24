import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import i18n from "../../i18n";
import type { PersistedAuthSession } from "../auth/contracts";
import { getOrCreateDeviceId } from "../auth/storage";
import { registerNotificationDevice, revokeNotificationDevice } from "./api";
import {
  clearStoredPushRegistration,
  getStoredPushRegistration,
  storePushRegistration,
} from "./storage";
import type {
  PushPermissionStatus,
  PushRegistrationStatus,
  StoredPushRegistration,
} from "./types";
import { resolveNotificationDeviceRole } from "./types";

let notificationsConfigured = false;

type SyncPushRegistrationOptions = {
  requestPermission?: boolean;
};

type SyncPushRegistrationResult = {
  status: PushRegistrationStatus;
  permissionStatus: PushPermissionStatus;
};

export function configureForegroundNotifications() {
  if (notificationsConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  notificationsConfigured = true;
}

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  if (Platform.OS === "web" || !Device.isDevice) {
    return "not-supported";
  }

  const settings = await Notifications.getPermissionsAsync();
  if (settings.status === "granted") {
    return "granted";
  }

  if (settings.status === "denied") {
    return "denied";
  }

  return "undetermined";
}

export async function syncPushRegistration(
  session: PersistedAuthSession,
  options?: SyncPushRegistrationOptions,
): Promise<SyncPushRegistrationResult> {
  const role = resolveNotificationDeviceRole(session.role);
  if (!role) {
    return {
      status: "not-supported",
      permissionStatus: "not-supported",
    };
  }

  let permissionStatus = await getPushPermissionStatus();
  if (permissionStatus === "undetermined" && options?.requestPermission) {
    const requested = await Notifications.requestPermissionsAsync();
    permissionStatus =
      requested.status === "granted"
        ? "granted"
        : requested.status === "denied"
          ? "denied"
          : "undetermined";
  }

  if (permissionStatus === "not-supported") {
    return { status: "not-supported", permissionStatus };
  }

  if (permissionStatus === "denied") {
    return { status: "denied", permissionStatus };
  }

  if (permissionStatus !== "granted") {
    return { status: "permission-required", permissionStatus };
  }

  try {
    const token = await getExpoPushToken();
    const deviceId = await getOrCreateDeviceId();

    await registerNotificationDevice({
      token,
      provider: "EXPO",
      platform: resolveNotificationPlatform(),
      role,
      deviceId,
      appVersion: resolveAppVersion(),
      locale: resolveLocale(),
      timezone: resolveTimezone(),
      enabled: true,
    });

    const storedRegistration: StoredPushRegistration = {
      token,
      deviceId,
      role,
      userId: session.user.id,
    };
    await storePushRegistration(storedRegistration);

    return { status: "registered", permissionStatus };
  } catch {
    return { status: "failed", permissionStatus };
  }
}

export async function revokeCurrentPushRegistration() {
  const stored = await getStoredPushRegistration();
  if (!stored) {
    return;
  }

  try {
    await revokeNotificationDevice({
      token: stored.token,
      deviceId: stored.deviceId,
    });
  } finally {
    await clearStoredPushRegistration();
  }
}

export function extractNotificationHref(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;
  if (typeof payload.routePath === "string" && payload.routePath.trim()) {
    return payload.routePath;
  }

  if (typeof payload.href === "string" && payload.href.trim()) {
    return payload.href;
  }

  if (
    payload.action &&
    typeof payload.action === "object" &&
    typeof (payload.action as Record<string, unknown>).href === "string"
  ) {
    return (payload.action as Record<string, string>).href;
  }

  return null;
}

function resolveNotificationPlatform() {
  if (Platform.OS === "ios") {
    return "IOS" as const;
  }

  if (Platform.OS === "android") {
    return "ANDROID" as const;
  }

  return "WEB" as const;
}

function resolveAppVersion() {
  return Constants.expoConfig?.version ?? "1.0.0";
}

function resolveLocale() {
  return i18n.language?.startsWith("ar") ? "ar" : "en";
}

function resolveTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "Africa/Cairo";
}

async function getExpoPushToken() {
  const projectId =
    Constants.easConfig?.projectId ??
    (
      Constants.expoConfig?.extra as
        | { eas?: { projectId?: string } }
        | undefined
    )?.eas?.projectId;

  if (projectId) {
    const response = await Notifications.getExpoPushTokenAsync({ projectId });
    return response.data;
  }

  const response = await Notifications.getExpoPushTokenAsync();
  return response.data;
}
