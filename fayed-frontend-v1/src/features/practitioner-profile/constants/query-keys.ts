/**
 * Stable React Query key factory for the public practitioner profile feature.
 */
export const practitionerProfileQueryKeys = {
  all: ["practitioner-profile"] as const,
  availabilityWindows: (slug: string, from: string, to: string) =>
    [...practitionerProfileQueryKeys.all, slug, "availability", "windows", from, to] as const,
};
