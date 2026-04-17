import type { AuthSuccessResponse, CurrentUserSummaryResponse } from "@/auth/api/auth.contracts";
import type { AuthSession, AuthUser, CurrentUserSummary } from "@/auth/domain/auth.types";

export function mapAuthUser(input: AuthSuccessResponse["user"]): AuthUser {
  return {
    id: input.id,
    displayName: input.displayName,
    primaryEmail: input.primaryEmail,
    roles: input.roles,
    status: input.status,
  };
}

export function mapAuthSession(input: AuthSuccessResponse): AuthSession {
  return {
    tokens: input.tokens,
    user: mapAuthUser(input.user),
  };
}

export function mapCurrentUserSummary(input: CurrentUserSummaryResponse): CurrentUserSummary {
  return {
    userId: input.userId,
    displayName: input.displayName,
    locale: input.locale,
    accountStatus: input.accountStatus,
    roles: input.roles,
    securityState: input.securityState,
    profileLinks: input.profileLinks,
  };
}

