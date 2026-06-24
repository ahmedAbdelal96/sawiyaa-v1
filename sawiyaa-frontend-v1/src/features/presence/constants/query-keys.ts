/**
 * Stable React Query key factory for the presence feature.
 */
export const presenceQueryKeys = {
  all: ["presence"] as const,
  me: () => [...presenceQueryKeys.all, "me"] as const,
};
