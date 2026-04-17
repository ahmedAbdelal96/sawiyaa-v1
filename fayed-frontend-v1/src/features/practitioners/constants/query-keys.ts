/**
 * Stable query keys for practitioner self-service slices.
 */
export const practitionersQueryKeys = {
  all: ["practitioners"] as const,
  me: () => [...practitionersQueryKeys.all, "me"] as const,
  meSpecialties: () => [...practitionersQueryKeys.me(), "specialties"] as const,
  meCredentials: () => [...practitionersQueryKeys.me(), "credentials"] as const,
  meApplication: () => [...practitionersQueryKeys.me(), "application"] as const,
  meReadiness: () => [...practitionersQueryKeys.me(), "readiness"] as const,
};

