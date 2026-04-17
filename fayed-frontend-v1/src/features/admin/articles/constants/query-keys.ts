import type { AdminArticleListParams } from "../types/admin-articles.types";

export const adminArticlesQueryKeys = {
  all: ["admin-articles"] as const,
  list: (params?: AdminArticleListParams) =>
    [...adminArticlesQueryKeys.all, "list", params ?? {}] as const,
  categories: (locale?: string) =>
    [...adminArticlesQueryKeys.all, "categories", locale ?? ""] as const,
  detail: (id: string, locale?: string) =>
    [...adminArticlesQueryKeys.all, "detail", id, locale ?? ""] as const,
};
