import { useQuery } from "@tanstack/react-query";
import i18n from "../../i18n";
import {
  fetchArticleBySlug,
  fetchArticleCategories,
  fetchArticles,
} from "./api";
import { articlesQueryKeys } from "./query-keys";
import type {
  ArticleCategoriesParams,
  ArticlesListParams,
  ArticleLocale,
} from "./types";
import { resolveArticleLocale } from "./types";

function getLocale(locale?: string): ArticleLocale {
  return resolveArticleLocale(locale ?? i18n.language);
}

export function useArticles(params: ArticlesListParams = {}) {
  const locale = getLocale(params.locale);
  const resolvedParams = {
    ...params,
    locale,
  };

  return useQuery({
    queryKey: articlesQueryKeys.list(resolvedParams),
    queryFn: () => fetchArticles(resolvedParams),
    staleTime: 60_000,
  });
}

export function useArticleBySlug(
  slug: string | null,
  locale?: string,
  options?: { enabled?: boolean },
) {
  const resolvedLocale = getLocale(locale);

  return useQuery({
    queryKey: articlesQueryKeys.detail(slug ?? "", resolvedLocale),
    queryFn: () => fetchArticleBySlug(slug!, resolvedLocale),
    enabled: Boolean(slug) && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useArticleCategories(
  params: ArticleCategoriesParams = {},
  options?: { enabled?: boolean },
) {
  const locale = getLocale(params.locale);
  const resolvedParams = {
    ...params,
    locale,
  };

  return useQuery({
    queryKey: articlesQueryKeys.categories(resolvedParams),
    queryFn: () => fetchArticleCategories(resolvedParams),
    enabled: options?.enabled ?? true,
    staleTime: 300_000,
  });
}
