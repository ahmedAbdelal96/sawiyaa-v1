import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  AuthTokens,
  AuthenticatedUser,
  MobileRole,
  PersistedAuthSession,
} from "./contracts";

const AUTH_SESSION_KEY = "fayed.mobile.auth.session.v1";
const DEVICE_ID_KEY = "fayed.mobile.device.id.v1";

function createDeviceId() {
  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function isMobileRole(value: unknown): value is MobileRole {
  return value === "patient" || value === "practitioner" || value === "admin";
}

function isAuthTokens(value: unknown): value is AuthTokens {
  if (!value || typeof value !== "object") {
    return false;
  }

  const tokens = value as Record<string, unknown>;
  return (
    typeof tokens.accessToken === "string" &&
    typeof tokens.refreshToken === "string" &&
    typeof tokens.accessTokenExpiresAt === "string" &&
    typeof tokens.refreshTokenExpiresAt === "string"
  );
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    Array.isArray(user.roles) &&
    typeof user.status === "string" &&
    typeof user.isEmailVerified === "boolean" &&
    typeof user.isPhoneVerified === "boolean"
  );
}

function isPersistedAuthSession(value: unknown): value is PersistedAuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Record<string, unknown>;
  return (
    isMobileRole(session.role) &&
    isAuthenticatedUser(session.user) &&
    isAuthTokens(session.tokens)
  );
}

export async function getStoredAuthSession() {
  const raw = await AsyncStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPersistedAuthSession(parsed)) {
      await AsyncStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    return parsed;
  } catch {
    await AsyncStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

export async function storeAuthSession(session: PersistedAuthSession) {
  await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredAuthSession() {
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
}

export async function getOrCreateDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const next = createDeviceId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}
