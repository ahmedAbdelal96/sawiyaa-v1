/**
 * Stable query keys for the auth feature.
 * Keeping keys centralized makes cache invalidation predictable across hooks.
 */
export const authQueryKeys = {
  all: ["auth"] as const,
  me: () => [...authQueryKeys.all, "me"] as const,
};

