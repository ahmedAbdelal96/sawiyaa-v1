/**
 * Slug normalization keeps specialty write behavior deterministic.
 * It is intentionally strict to avoid surprise duplicate slugs caused by formatting differences.
 */
export function normalizeSpecialtySlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
