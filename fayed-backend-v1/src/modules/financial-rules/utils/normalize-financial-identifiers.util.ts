/**
 * Financial identifiers are normalized in one place so coupon codes and slugs
 * stay deterministic across validation, storage, and payment snapshots.
 */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
