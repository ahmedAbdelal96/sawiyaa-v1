export type CategorySeedEntry = {
  slugRoot: string;
  titleAr: string;
  titleEn: string;
  slugAr: string;
  slugEn: string;
  sortOrder: number;
};

export type ArticleSeedEntry = {
  slugAr: string;
  slugEn: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  contentAr: string;
  contentEn: string;
  authorSeedKey: string;
  categorySlugRoot: string;
  publishedAtDaysAgo: number;
  status: 'PUBLISHED' | 'DRAFT' | 'SUBMITTED';
  visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  scheduledDaysFromNow?: number;
  hasCover: boolean;
};