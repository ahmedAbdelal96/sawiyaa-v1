import { AxiosError } from "axios";
import { apiClient, extractApiData } from "../../lib/api";
import {
  ArticleCategoriesResponse,
  ArticleDetails,
  ArticleItemResponse,
  ArticlesListParams,
  ArticlesListResponse,
  ArticleCategoriesParams,
  resolveArticleLocale,
} from "./types";

export async function fetchArticles(
  params: ArticlesListParams = {},
): Promise<ArticlesListResponse> {
  const response = await apiClient.get("/articles", {
    params: {
      page: params.page,
      limit: params.limit,
      locale: resolveArticleLocale(params.locale),
      categorySlug: params.categorySlug,
      categoryRoot: params.categoryRoot,
      q: params.q,
    },
  });

  return extractApiData<ArticlesListResponse>(response);
}

export async function fetchArticleBySlug(
  slug: string,
  locale?: string,
): Promise<ArticleDetails | null> {
  try {
    const response = await apiClient.get(`/articles/${slug}`, {
      params: {
        locale: resolveArticleLocale(locale),
      },
    });

    const data = extractApiData<ArticleItemResponse>(response);
    return data.item;
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function fetchArticleCategories(
  params: ArticleCategoriesParams = {},
): Promise<ArticleCategoriesResponse> {
  const response = await apiClient.get("/article-categories", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      locale: resolveArticleLocale(params.locale),
    },
  });

  return extractApiData<ArticleCategoriesResponse>(response);
}
