/**
 * Stable query keys for user bootstrapping endpoints.
 */
export const usersQueryKeys = {
  all: ["users"] as const,
  me: () => [...usersQueryKeys.all, "me"] as const,
  meRoles: () => [...usersQueryKeys.all, "me", "roles"] as const,
  meSecurityState: () => [...usersQueryKeys.all, "me", "security-state"] as const,
};

