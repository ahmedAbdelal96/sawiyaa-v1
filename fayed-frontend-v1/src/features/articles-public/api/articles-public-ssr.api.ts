import { serverGet } from "@/lib/api/server-http-client";
import type {
  PublicArticleDetails,
  PublicArticlesListData,
} from "../types/articles-public.types";

export const PUBLIC_ARTICLES_ROUTES = {
  list: "/articles",
  bySlug: (slug: string) => `/articles/${slug}`,
} as const;

type ListPublicArticlesParams = {
  page?: number;
  limit?: number;
  categorySlug?: string;
  q?: string;
};

type PublicArticleItemData = {
  item: PublicArticleDetails;
};

export async function fetchPublicArticles(
  locale: string,
  params: ListPublicArticlesParams = {},
): Promise<PublicArticlesListData> {
  return serverGet<PublicArticlesListData>(PUBLIC_ARTICLES_ROUTES.list, {
    locale,
    params: {
      page: params.page,
      limit: params.limit,
      categorySlug: params.categorySlug,
      q: params.q,
    },
  });
}

export async function fetchPublicArticleBySlug(
  slug: string,
  locale: string,
): Promise<PublicArticleDetails | null> {
  try {
    const data = await serverGet<PublicArticleItemData>(PUBLIC_ARTICLES_ROUTES.bySlug(slug), {
      locale,
    });
    return data.item;
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}
