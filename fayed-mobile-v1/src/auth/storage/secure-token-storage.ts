import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { AuthTokens } from "@/auth/domain/auth.types";
import { storageKeys } from "@/core/constants/storage";

export const secureTokenStorage = {
  async save(tokens: AuthTokens) {
    if (Platform.OS === "web") {
      localStorage.setItem(storageKeys.accessToken, tokens.accessToken);
      localStorage.setItem(storageKeys.refreshToken, tokens.refreshToken);
      localStorage.setItem(`${storageKeys.accessToken}.expiresAt`, tokens.accessTokenExpiresAt);
      localStorage.setItem(`${storageKeys.refreshToken}.expiresAt`, tokens.refreshTokenExpiresAt);
      return;
    }

    await Promise.all([
      SecureStore.setItemAsync(storageKeys.accessToken, tokens.accessToken),
      SecureStore.setItemAsync(storageKeys.refreshToken, tokens.refreshToken),
      SecureStore.setItemAsync(`${storageKeys.accessToken}.expiresAt`, tokens.accessTokenExpiresAt),
      SecureStore.setItemAsync(`${storageKeys.refreshToken}.expiresAt`, tokens.refreshTokenExpiresAt),
    ]);
  },

  async read(): Promise<AuthTokens | null> {
    if (Platform.OS === "web") {
      const accessToken = localStorage.getItem(storageKeys.accessToken);
      const refreshToken = localStorage.getItem(storageKeys.refreshToken);
      const accessTokenExpiresAt = localStorage.getItem(`${storageKeys.accessToken}.expiresAt`);
      const refreshTokenExpiresAt = localStorage.getItem(`${storageKeys.refreshToken}.expiresAt`);

      if (!accessToken || !refreshToken || !accessTokenExpiresAt || !refreshTokenExpiresAt) {
        return null;
      }

      return {
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      };
    }

    const [accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt] =
      await Promise.all([
        SecureStore.getItemAsync(storageKeys.accessToken),
        SecureStore.getItemAsync(storageKeys.refreshToken),
        SecureStore.getItemAsync(`${storageKeys.accessToken}.expiresAt`),
        SecureStore.getItemAsync(`${storageKeys.refreshToken}.expiresAt`),
      ]);

    if (!accessToken || !refreshToken || !accessTokenExpiresAt || !refreshTokenExpiresAt) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  },

  async clear() {
    if (Platform.OS === "web") {
      localStorage.removeItem(storageKeys.accessToken);
      localStorage.removeItem(storageKeys.refreshToken);
      localStorage.removeItem(`${storageKeys.accessToken}.expiresAt`);
      localStorage.removeItem(`${storageKeys.refreshToken}.expiresAt`);
      return;
    }

    await Promise.all([
      SecureStore.deleteItemAsync(storageKeys.accessToken),
      SecureStore.deleteItemAsync(storageKeys.refreshToken),
      SecureStore.deleteItemAsync(`${storageKeys.accessToken}.expiresAt`),
      SecureStore.deleteItemAsync(`${storageKeys.refreshToken}.expiresAt`),
    ]);
  },
};
