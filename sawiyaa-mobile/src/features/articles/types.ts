export type ArticleLocale = "ar" | "en";

export type ArticleFreshnessBand =
  | "NEW"
  | "RECENT"
  | "ESTABLISHED"
  | "UNPUBLISHED";

export type ArticleTrustReasonCode =
  | "PUBLISHED_DATE_VERIFIED"
  | "RECENTLY_PUBLISHED"
  | "ESTABLISHED_CONTENT"
  | "AUTHOR_ATTRIBUTED"
  | "AUTHOR_UNATTRIBUTED";

export type ArticleCategory = {
  id: string;
  slugRoot: string;
  slug: string;
  title: string;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type ArticleTrustMetadata = {
  freshnessBand: ArticleFreshnessBand;
  isFreshContent: boolean;
  authorDisplayName: string | null;
  reasonCodes: ArticleTrustReasonCode[];
};

export type ArticleListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  category: ArticleCategory | null;
  trust: ArticleTrustMetadata;
};

export type ArticleDetails = ArticleListItem & {
  content: string;
  seo: {
    metaTitle: string | null;
    metaDescription: string | null;
  };
  locale: ArticleLocale;
};

export type ArticlesPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type ArticlesListResponse = {
  items: ArticleListItem[];
  pagination: ArticlesPagination;
};

export type ArticleItemResponse = {
  item: ArticleDetails;
};

export type ArticleCategoriesResponse = {
  items: ArticleCategory[];
  pagination: ArticlesPagination;
};

export type ArticlesListParams = {
  page?: number;
  limit?: number;
  locale?: ArticleLocale;
  categorySlug?: string;
  categoryRoot?: string;
  q?: string;
};

export type ArticleCategoriesParams = {
  page?: number;
  limit?: number;
  locale?: ArticleLocale;
};

export function resolveArticleLocale(locale?: string | null): ArticleLocale {
  return locale?.startsWith("ar") ? "ar" : "en";
}
