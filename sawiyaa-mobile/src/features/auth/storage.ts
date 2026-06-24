import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  AuthenticatedUser,
  MobileSupportedRole,
  PersistedAuthSession,
} from "./contracts";
import {
  clearSecureAuthTokens,
  getSecureAuthTokens,
  setSecureAuthTokens,
} from "./secure-token-storage";

const AUTH_SESSION_KEY_V1 = "sawiyaa.mobile.auth.session.v1";
const AUTH_SESSION_KEY_V2 = "sawiyaa.mobile.auth.session.v2";
const DEVICE_ID_KEY = "sawiyaa.mobile.device.id.v1";

function createDeviceId() {
  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Runtime validator for the persisted mobile role.
 * Only "patient" and "practitioner" are accepted — "admin" and any
 * other string are intentionally rejected.
 */
function isMobileSupportedRole(value: unknown): value is MobileSupportedRole {
  return value === "patient" || value === "practitioner";
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
    isMobileSupportedRole(session.role) &&
    isAuthenticatedUser(session.user) &&
    Boolean(session.tokens) &&
    typeof session.tokens === "object"
  );
}

export async function getStoredAuthSession() {
  const rawV2 = await AsyncStorage.getItem(AUTH_SESSION_KEY_V2);
  if (rawV2) {
    try {
      const parsed = JSON.parse(rawV2) as unknown;
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !isMobileSupportedRole((parsed as any).role) ||
        !isAuthenticatedUser((parsed as any).user)
      ) {
        await AsyncStorage.removeItem(AUTH_SESSION_KEY_V2);
        return null;
      }

      const tokens = await getSecureAuthTokens();
      if (!tokens) {
        // Metadata without tokens => fail closed.
        await AsyncStorage.removeItem(AUTH_SESSION_KEY_V2);
        return null;
      }

      return {
        role: (parsed as any).role,
        user: (parsed as any).user,
        tokens,
      } as PersistedAuthSession;
    } catch {
      await AsyncStorage.removeItem(AUTH_SESSION_KEY_V2);
      return null;
    }
  }

  try {
    const rawV1 = await AsyncStorage.getItem(AUTH_SESSION_KEY_V1);
    if (!rawV1) {
      return null;
    }

    const parsed = JSON.parse(rawV1) as unknown;
    if (!isPersistedAuthSession(parsed)) {
      await AsyncStorage.removeItem(AUTH_SESSION_KEY_V1);
      return null;
    }

    const legacy = parsed as PersistedAuthSession;
    try {
      await setSecureAuthTokens(legacy.tokens);
      await AsyncStorage.setItem(
        AUTH_SESSION_KEY_V2,
        JSON.stringify({ role: legacy.role, user: legacy.user }),
      );
      await AsyncStorage.removeItem(AUTH_SESSION_KEY_V1);
      return legacy;
    } catch {
      await Promise.all([
        clearSecureAuthTokens(),
        AsyncStorage.removeItem(AUTH_SESSION_KEY_V1),
        AsyncStorage.removeItem(AUTH_SESSION_KEY_V2),
      ]);
      return null;
    }
  } catch {
    await AsyncStorage.removeItem(AUTH_SESSION_KEY_V1);
    return null;
  }
}

export async function storeAuthSession(session: PersistedAuthSession) {
  try {
    await setSecureAuthTokens(session.tokens);
    await AsyncStorage.setItem(
      AUTH_SESSION_KEY_V2,
      JSON.stringify({ role: session.role, user: session.user }),
    );
  } catch {
    // Fail closed: never keep a partially-persisted session.
    await Promise.all([
      clearSecureAuthTokens(),
      AsyncStorage.removeItem(AUTH_SESSION_KEY_V2),
    ]);
    throw new Error("Failed to persist auth session securely.");
  }
}

export async function clearStoredAuthSession() {
  await Promise.all([
    clearSecureAuthTokens(),
    AsyncStorage.removeItem(AUTH_SESSION_KEY_V2),
    AsyncStorage.removeItem(AUTH_SESSION_KEY_V1),
  ]);
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
