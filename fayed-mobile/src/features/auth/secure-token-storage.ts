import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AuthTokens } from "./contracts";

const ACCESS_TOKEN_KEY = "fayed.mobile.auth.tokens.access.v1";
const REFRESH_TOKEN_KEY = "fayed.mobile.auth.tokens.refresh.v1";
const ACCESS_EXPIRES_AT_KEY = "fayed.mobile.auth.tokens.access.expiresAt.v1";
const REFRESH_EXPIRES_AT_KEY = "fayed.mobile.auth.tokens.refresh.expiresAt.v1";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAuthTokens(value: unknown): value is AuthTokens {
  if (!value || typeof value !== "object") {
    return false;
  }

  const tokens = value as Record<string, unknown>;
  return (
    isNonEmptyString(tokens.accessToken) &&
    isNonEmptyString(tokens.refreshToken) &&
    isNonEmptyString(tokens.accessTokenExpiresAt) &&
    isNonEmptyString(tokens.refreshTokenExpiresAt)
  );
}

/**
 * Secure token storage for mobile.
 *
 * - Uses Keychain (iOS) / Keystore (Android) via Expo SecureStore.
 * - On web, SecureStore is not supported; we fail closed and return null.
 */
export async function getSecureAuthTokens(): Promise<AuthTokens | null> {
  if (Platform.OS === "web") {
    return null;
  }

  const [accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt] =
    await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.getItemAsync(ACCESS_EXPIRES_AT_KEY),
      SecureStore.getItemAsync(REFRESH_EXPIRES_AT_KEY),
    ]);

  const candidate = {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  };

  return isAuthTokens(candidate) ? (candidate as AuthTokens) : null;
}

export async function setSecureAuthTokens(tokens: AuthTokens): Promise<void> {
  if (Platform.OS === "web") {
    // Explicitly do not persist tokens on web.
    return;
  }

  // Best-effort atomic: write access+refresh+expiries, then validate on restore.
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
    SecureStore.setItemAsync(ACCESS_EXPIRES_AT_KEY, tokens.accessTokenExpiresAt),
    SecureStore.setItemAsync(REFRESH_EXPIRES_AT_KEY, tokens.refreshTokenExpiresAt),
  ]);
}

export async function clearSecureAuthTokens(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(ACCESS_EXPIRES_AT_KEY),
    SecureStore.deleteItemAsync(REFRESH_EXPIRES_AT_KEY),
  ]);
}

