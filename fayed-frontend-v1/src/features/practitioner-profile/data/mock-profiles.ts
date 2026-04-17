import { MOCK_PRACTITIONERS } from "@/features/practitioners-discovery/data/mock-practitioners";
import type { SpecialtyId } from "@/features/practitioners-discovery/types/practitioner";
import type { PractitionerProfile } from "../types/profile";

/**
 * Legacy mock file kept only for compatibility with older imports.
 * Public practitioner pages are now SSR-backed by the real backend contract.
 */
export const MOCK_PROFILES: PractitionerProfile[] = [];

export function getPractitionerProfile(
  id: string,
): PractitionerProfile | undefined {
  return MOCK_PROFILES.find((profile) => profile.id === id);
}

export function getRelatedPractitioners(
  currentId: string,
  specialties: SpecialtyId[],
  limit = 3,
) {
  return MOCK_PRACTITIONERS.filter(
    (practitioner) =>
      practitioner.id !== currentId &&
      practitioner.specialties.some((specialty) =>
        specialties.includes(specialty as SpecialtyId),
      ),
  ).slice(0, limit);
}
