// Cover image path helpers.
// PRODUCTION: The ArticleCoverStorageService serves files from:
//   {process.cwd()}/storage/articles/{fileName}
// and exposes them at GET /api/v1/article-covers/{fileName}
// Only .jpg, .png, .webp are allowed (no SVG).
//
// SEED/DEV: Returns internet URLs from picsum.photos for testing without local storage.

const CATEGORY_COVER_SEEDS: Record<string, string[]> = {
  'mental-health': ['mental-health-1', 'mental-health-2', 'mental-health-3', 'mental-health-4'],
  nutrition: ['nutrition-1', 'nutrition-2', 'nutrition-3', 'nutrition-4'],
  fitness: ['fitness-1', 'fitness-2', 'fitness-3', 'fitness-4'],
  sleep: ['sleep-1', 'sleep-2', 'sleep-3', 'sleep-4'],
  relationships: ['relationships-1', 'relationships-2', 'relationships-3', 'relationships-4'],
  'daily-habits': ['daily-habits-1', 'daily-habits-2', 'daily-habits-3', 'daily-habits-4'],
};

const CATEGORY_COVER_MAP: Record<string, string[]> = {
  'mental-health': ['mental-health-01.png', 'mental-health-02.png', 'mental-health-03.png', 'mental-health-04.png'],
  nutrition: ['nutrition-01.png', 'nutrition-02.png', 'nutrition-03.png', 'nutrition-04.png'],
  fitness: ['fitness-01.png', 'fitness-02.png', 'fitness-03.png', 'fitness-04.png'],
  sleep: ['sleep-01.png', 'sleep-02.png', 'sleep-03.png', 'sleep-04.png'],
  relationships: ['relationships-01.png', 'relationships-02.png', 'relationships-03.png', 'relationships-04.png'],
  'daily-habits': ['daily-habits-01.png', 'daily-habits-02.png', 'daily-habits-03.png', 'daily-habits-04.png'],
};

/**
 * Returns the cover image URL for a given category and slot (0-3).
 * Returns null if no cover should be assigned (null-cover article).
 *
 * Seed/dev mode: Returns deterministic picsum.photos URLs (no local storage needed).
 * Production: Returns local storage paths via ArticleCoverStorageService.
 */
export function getArticleCoverPath(
  categorySlugRoot: string,
  slot: number,
  hasCover: boolean,
): string | null {
  if (!hasCover) return null;
  const seeds = CATEGORY_COVER_SEEDS[categorySlugRoot];
  if (!seeds) return null;
  const seed = seeds[slot % seeds.length];
  // Deterministic image from internet for seed data testing
  return `https://picsum.photos/seed/${seed}/800/600`;
}

/**
 * Returns the local storage fileName for a given category and slot (0-3).
 * Used by ArticleCoverStorageService for production file resolution.
 */
export function getArticleCoverFileName(
  categorySlugRoot: string,
  slot: number,
): string | null {
  const paths = CATEGORY_COVER_MAP[categorySlugRoot];
  if (!paths) return null;
  return paths[slot % paths.length] ?? null;
}

/**
 * Lists all 24 cover fileNames that should exist in storage/articles/.
 */
export function getAllCoverFileNames(): string[] {
  return Object.values(CATEGORY_COVER_MAP).flat();
}
