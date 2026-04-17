import { randomUUID } from 'crypto';

/**
 * Practitioners baseline needs a public slug even before the practitioner finishes onboarding.
 * We generate a safe draft slug here and let future modules manage advanced public-profile slug workflows.
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

