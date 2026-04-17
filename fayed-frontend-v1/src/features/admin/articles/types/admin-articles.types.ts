export type ArticleStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED"
  | "ARCHIVED";

export type ContentLocale = "ar" | "en";

export type AdminArticleCategory = {
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

export type AdminArticleTrustMetadata = {
  freshnessBand: "NEW" | "RECENT" | "ESTABLISHED" | "UNPUBLISHED";
  isFreshContent: boolean;
  authorDisplayName: string | null;
  reasonCodes: Array<
    | "PUBLISHED_DATE_VERIFIED"
    | "RECENTLY_PUBLISHED"
    | "ESTABLISHED_CONTENT"
    | "AUTHOR_ATTRIBUTED"
    | "AUTHOR_UNATTRIBUTED"
  >;
};

export type AdminArticleSeo = {
  metaTitle: string | null;
  metaDescription: string | null;
};

export type AdminArticleItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  category: AdminArticleCategory | null;
  trust: AdminArticleTrustMetadata;
  content: string;
  seo: AdminArticleSeo;
  locale: ContentLocale;
  status: ArticleStatus;
  archivedAt: string | null;
  authorUserId: string;
  updatedAt: string | null;
  createdAt: string | null;
};

export type ArticlesPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type AdminArticleListResponse = {
  items: AdminArticleItem[];
  pagination: ArticlesPagination;
};

export type AdminArticleItemResponse = {
  item: AdminArticleItem;
};

export type AdminArticleListParams = {
  page?: number;
  limit?: number;
  status?: ArticleStatus;
  locale?: ContentLocale;
  categoryId?: string;
  q?: string;
};

export type AdminArticleCategoryListResponse = {
  items: AdminArticleCategory[];
  pagination: ArticlesPagination;
};

export type CreateAdminArticleInput = {
  locale: ContentLocale;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  primaryCategoryId: string;
  coverImageUrl?: string;
  featuredImageAlt?: string;
  metaTitle?: string;
  metaDescription?: string;
};

export type UpdateAdminArticleInput = Partial<CreateAdminArticleInput>;
