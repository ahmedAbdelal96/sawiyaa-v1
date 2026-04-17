import { create } from "zustand";

import type { AuthTokens, AuthUser, CurrentUserSummary } from "@/auth/domain/auth.types";

export type AuthStatus = "checking" | "authenticated" | "unauthenticated";

type AuthState = {
  status: AuthStatus;
  tokens: AuthTokens | null;
  user: AuthUser | null;
  profile: CurrentUserSummary | null;
  setChecking: () => void;
  setSession: (payload: { tokens: AuthTokens; user: AuthUser; profile?: CurrentUserSummary | null }) => void;
  setProfile: (profile: CurrentUserSummary) => void;
  clearSession: () => void;
};

export const useAuthSessionStore = create<AuthState>((set) => ({
  status: "checking",
  tokens: null,
  user: null,
  profile: null,
  setChecking: () => set({ status: "checking" }),
  setSession: ({ tokens, user, profile = null }) =>
    set({
      status: "authenticated",
      tokens,
      user,
      profile,
    }),
  setProfile: (profile) => set({ profile }),
  clearSession: () =>
    set({
      status: "unauthenticated",
      tokens: null,
      user: null,
      profile: null,
    }),
}));

