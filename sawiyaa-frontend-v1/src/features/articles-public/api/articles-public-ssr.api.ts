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
  categoryRoot?: string;
  q?: string;
};

export type PublicArticleCategoriesListData = {
  items: Array<{
    id: string;
    slugRoot: string;
    slug: string;
    title: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export type PublicSpecialtyCategoryFilterItem = {
  id: string;
  slug: string;
  name: string;
  nameAr?: string | null;
  nameEn?: string | null;
};

export type PublicSpecialtyFilterItem = {
  id: string;
  slug: string;
  name: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  category: PublicSpecialtyCategoryFilterItem | null;
};

type PublicSpecialtyCategoriesResponse = {
  categories: PublicSpecialtyCategoryFilterItem[];
};

type PublicSpecialtiesResponse = {
  specialties: PublicSpecialtyFilterItem[];
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
      categoryRoot: params.categoryRoot,
      q: params.q,
    },
  });
}

export async function fetchPublicArticleCategories(
  locale: string,
): Promise<PublicArticleCategoriesListData> {
  return serverGet<PublicArticleCategoriesListData>("/article-categories", {
    locale,
    params: {
      page: 1,
      limit: 200,
    },
  });
}

export async function fetchPublicSpecialtyCategories(
  locale: string,
): Promise<PublicSpecialtyCategoryFilterItem[]> {
  const data = await serverGet<PublicSpecialtyCategoriesResponse>(
    "/specialty-categories",
    {
      locale,
    },
  );
  return data.categories ?? [];
}

export async function fetchPublicSpecialties(
  locale: string,
): Promise<PublicSpecialtyFilterItem[]> {
  const data = await serverGet<PublicSpecialtiesResponse>("/specialties", {
    locale,
  });
  return data.specialties ?? [];
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
