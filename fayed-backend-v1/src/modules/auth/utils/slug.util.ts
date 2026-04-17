import { randomUUID } from 'crypto';

/**
 * Practitioner profile creation requires a public slug, but onboarding details are still out of scope.
 * This helper generates a deterministic-enough draft slug during account creation.
 */
export function buildDraftPractitionerSlug(seed: string): string {
  const normalized = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

  const suffix = randomUUID().replace(/-/g, '').slice(0, 6);
  return `${normalized || 'practitioner'}-${suffix}`;
}
