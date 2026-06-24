export type PublicArticleFreshnessBand =
  | "NEW"
  | "RECENT"
  | "ESTABLISHED"
  | "UNPUBLISHED";

export type PublicArticleTrustReasonCode =
  | "PUBLISHED_DATE_VERIFIED"
  | "RECENTLY_PUBLISHED"
  | "ESTABLISHED_CONTENT"
  | "AUTHOR_ATTRIBUTED"
  | "AUTHOR_UNATTRIBUTED";

export type PublicArticleCategory = {
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

export type PublicArticleTrustMetadata = {
  freshnessBand: PublicArticleFreshnessBand;
  isFreshContent: boolean;
  authorDisplayName: string | null;
  reasonCodes: PublicArticleTrustReasonCode[];
};

export type PublicArticleListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  category: PublicArticleCategory | null;
  trust: PublicArticleTrustMetadata;
};

export type PublicArticleDetails = PublicArticleListItem & {
  content: string;
  seo: {
    metaTitle: string | null;
    metaDescription: string | null;
  };
  locale: "ar" | "en";
};

export type PublicArticlesPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type PublicArticlesListData = {
  items: PublicArticleListItem[];
  pagination: PublicArticlesPagination;
};
