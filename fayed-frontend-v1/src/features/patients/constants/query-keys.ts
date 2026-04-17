/**
 * Stable patient self-profile query keys.
 */
export const patientsQueryKeys = {
  all: ["patients"] as const,
  me: () => [...patientsQueryKeys.all, "me"] as const,
};

