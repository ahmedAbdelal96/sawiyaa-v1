import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthTokens } from "./contracts";

const ACCESS_TOKEN_KEY = "sawiyaa.mobile.auth.tokens.access.v1";
const REFRESH_TOKEN_KEY = "sawiyaa.mobile.auth.tokens.refresh.v1";
const ACCESS_EXPIRES_AT_KEY = "sawiyaa.mobile.auth.tokens.access.expiresAt.v1";
const REFRESH_EXPIRES_AT_KEY = "sawiyaa.mobile.auth.tokens.refresh.expiresAt.v1";

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
 * Token storage — platform-aware.
 *
 * - Native (iOS/Android): Keychain / Keystore via Expo SecureStore.
 * - Web/Expo web: AsyncStorage (browser-compatible, no Keychain on web).
 */
export async function getSecureAuthTokens(): Promise<AuthTokens | null> {
  if (Platform.OS === "web") {
    const [accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt] =
      await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(ACCESS_EXPIRES_AT_KEY),
        AsyncStorage.getItem(REFRESH_EXPIRES_AT_KEY),
      ]);

    const candidate = {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };

    return isAuthTokens(candidate) ? (candidate as AuthTokens) : null;
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
    await Promise.all([
      AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
      AsyncStorage.setItem(ACCESS_EXPIRES_AT_KEY, tokens.accessTokenExpiresAt),
      AsyncStorage.setItem(REFRESH_EXPIRES_AT_KEY, tokens.refreshTokenExpiresAt),
    ]);
    return;
  }

  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
    SecureStore.setItemAsync(ACCESS_EXPIRES_AT_KEY, tokens.accessTokenExpiresAt),
    SecureStore.setItemAsync(REFRESH_EXPIRES_AT_KEY, tokens.refreshTokenExpiresAt),
  ]);
}

export async function clearSecureAuthTokens(): Promise<void> {
  if (Platform.OS === "web") {
    await Promise.all([
      AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(ACCESS_EXPIRES_AT_KEY),
      AsyncStorage.removeItem(REFRESH_EXPIRES_AT_KEY),
    ]);
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(ACCESS_EXPIRES_AT_KEY),
    SecureStore.deleteItemAsync(REFRESH_EXPIRES_AT_KEY),
  ]);
}

