import type {
  ArticleCategoriesParams,
  ArticlesListParams,
} from "./types";

export const articlesQueryKeys = {
  all: ["articles"] as const,
  list: (params?: ArticlesListParams) =>
    [...articlesQueryKeys.all, "list", params ?? {}] as const,
  infiniteList: (params?: ArticlesListParams) =>
    [...articlesQueryKeys.all, "infinite-list", params ?? {}] as const,
  detail: (slug: string, locale?: string) =>
    [...articlesQueryKeys.all, "detail", slug, locale ?? ""] as const,
  categories: (params?: ArticleCategoriesParams) =>
    [...articlesQueryKeys.all, "categories", params ?? {}] as const,
};
