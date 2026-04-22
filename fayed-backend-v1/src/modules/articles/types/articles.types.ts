import {
  ArticleStatus,
  ArticleVisibility,
  ContentLocale,
} from '@prisma/client';

export const ARTICLE_DEFAULT_PAGE = 1;
export const ARTICLE_DEFAULT_LIMIT = 12;
export const ARTICLE_ADMIN_DEFAULT_LIMIT = 20;

export const ARTICLE_ALLOWED_PUBLIC_VISIBILITIES: ArticleVisibility[] = [
  ArticleVisibility.PUBLIC,
];

export const ARTICLE_ALLOWED_PUBLIC_DETAIL_VISIBILITIES: ArticleVisibility[] = [
  ArticleVisibility.PUBLIC,
  ArticleVisibility.UNLISTED,
];

export const ARTICLE_V1_LIFECYCLE_STATES: ArticleStatus[] = [
  ArticleStatus.DRAFT,
  ArticleStatus.PUBLISHED,
  ArticleStatus.ARCHIVED,
];

export const ARTICLE_DEFAULT_LOCALE = ContentLocale.ar;

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
