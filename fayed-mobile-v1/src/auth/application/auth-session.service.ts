import { getCurrentUserSummaryRequest, loginPatient, logoutPatient, refreshPatientSession, registerPatient } from "@/auth/api/auth.api";
import type { LoginPayload, RegisterPayload } from "@/auth/api/auth.contracts";
import { mapAuthSession, mapCurrentUserSummary } from "@/auth/api/auth.mappers";
import { secureTokenStorage } from "@/auth/storage/secure-token-storage";
import { getCachedTokens, setCachedTokens } from "@/auth/storage/token-cache";
import { useAuthSessionStore } from "@/auth/store/auth-session.store";
import { logger } from "@/core/logger";
import { clearAppQueryCache } from "@/networking/query/query-client";

export const authSessionService = {
  async login(payload: LoginPayload) {
    const result = await loginPatient(payload);
    const session = mapAuthSession(result);

    await secureTokenStorage.save(session.tokens);
    setCachedTokens(session.tokens);
    const profile = mapCurrentUserSummary(await getCurrentUserSummaryRequest());
    useAuthSessionStore.getState().setSession({ ...session, profile });

    return profile;
  },

  async register(payload: RegisterPayload) {
    const result = await registerPatient(payload);
    const session = mapAuthSession(result);

    await secureTokenStorage.save(session.tokens);
    setCachedTokens(session.tokens);
    const profile = mapCurrentUserSummary(await getCurrentUserSummaryRequest());
    useAuthSessionStore.getState().setSession({ ...session, profile });

    return profile;
  },

  async refresh() {
    const existingTokens = getCachedTokens() || (await secureTokenStorage.read());

    if (!existingTokens?.refreshToken) {
      throw new Error("No refresh token available.");
    }

    const refreshed = mapAuthSession(await refreshPatientSession(existingTokens.refreshToken));
    await secureTokenStorage.save(refreshed.tokens);
    setCachedTokens(refreshed.tokens);

    const currentState = useAuthSessionStore.getState();
    currentState.setSession({
      tokens: refreshed.tokens,
      user: refreshed.user,
      profile: currentState.profile,
    });

    return refreshed.tokens;
  },

  async bootstrap() {
    const persistedTokens = await secureTokenStorage.read();

    if (!persistedTokens) {
      useAuthSessionStore.getState().clearSession();
      return;
    }

    try {
      setCachedTokens(persistedTokens);
      const refreshed = await authSessionService.refresh();
      const profile = mapCurrentUserSummary(await getCurrentUserSummaryRequest());
      const currentState = useAuthSessionStore.getState();

      currentState.setProfile(profile);
      currentState.setSession({
        tokens: refreshed,
        user: currentState.user || {
          id: profile.userId,
          displayName: profile.displayName,
          primaryEmail: null,
          roles: profile.roles.roles,
          status: profile.accountStatus,
        },
        profile,
      });
    } catch (error) {
      logger.warn("Bootstrap session failed", error);
      await authSessionService.clear();
    }
  },

  async logout() {
    const currentTokens = getCachedTokens() || (await secureTokenStorage.read());

    try {
      if (currentTokens?.refreshToken) {
        await logoutPatient(currentTokens.refreshToken);
      }
    } catch (error) {
      logger.warn("Logout request failed", error);
    } finally {
      await authSessionService.clear();
    }
  },

  async clear() {
    await secureTokenStorage.clear();
    setCachedTokens(null);
    clearAppQueryCache();
    useAuthSessionStore.getState().clearSession();
  },
};
