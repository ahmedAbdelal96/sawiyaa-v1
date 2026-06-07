// Cover image path helpers.
// The ArticleCoverStorageService serves files from:
//   {process.cwd()}/storage/articles/{fileName}
// and exposes them at GET /api/v1/article-covers/{fileName}
// Only .jpg, .png, .webp are allowed (no SVG).

const CATEGORY_COVER_MAP: Record<string, string[]> = {
  'mental-health': ['mental-health-01.png', 'mental-health-02.png', 'mental-health-03.png', 'mental-health-04.png'],
  nutrition: ['nutrition-01.png', 'nutrition-02.png', 'nutrition-03.png', 'nutrition-04.png'],
  fitness: ['fitness-01.png', 'fitness-02.png', 'fitness-03.png', 'fitness-04.png'],
  sleep: ['sleep-01.png', 'sleep-02.png', 'sleep-03.png', 'sleep-04.png'],
  relationships: ['relationships-01.png', 'relationships-02.png', 'relationships-03.png', 'relationships-04.png'],
  'daily-habits': ['daily-habits-01.png', 'daily-habits-02.png', 'daily-habits-03.png', 'daily-habits-04.png'],
};

/**
 * Returns the cover fileName for a given category and slot (0-3).
 * Returns null if no cover should be assigned (null-cover article).
 *
 * Usage in fixtures: pass `hasCover: boolean` and the slot index, then call this.
 */
export function getArticleCoverPath(
  categorySlugRoot: string,
  slot: number,
  hasCover: boolean,
): string | null {
  if (!hasCover) return null;
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
