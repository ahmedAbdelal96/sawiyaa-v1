import type { AuthTokens } from "@/auth/domain/auth.types";

let cachedTokens: AuthTokens | null = null;

export function getCachedTokens() {
  return cachedTokens;
}

export function setCachedTokens(tokens: AuthTokens | null) {
  cachedTokens = tokens;
}

