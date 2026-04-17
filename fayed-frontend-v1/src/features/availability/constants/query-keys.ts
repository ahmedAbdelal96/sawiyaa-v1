/**
 * Stable React Query key factory for the availability feature.
 */
export const availabilityQueryKeys = {
  all: ["availability"] as const,
  me: () => [...availabilityQueryKeys.all, "me"] as const,
};
