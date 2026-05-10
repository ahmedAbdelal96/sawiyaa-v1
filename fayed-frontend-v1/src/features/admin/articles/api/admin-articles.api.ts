import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminArticleCategoryListResponse,
  AdminArticleCoverUploadResponse,
  AdminArticleItemResponse,
  AdminArticleListParams,
  AdminArticleListResponse,
  CreateAdminArticleInput,
  UpdateAdminArticleInput,
} from "../types/admin-articles.types";

export async function getAdminArticles(
  params: AdminArticleListParams,
): Promise<AdminArticleListResponse> {
  const response = await httpClient.get<ApiPayload<AdminArticleListResponse>>(
    "/admin/articles",
    { params },
  );
  return extractData(response.data);
}

export async function getAdminArticleCategories(
  locale?: string,
): Promise<AdminArticleCategoryListResponse> {
  const response = await httpClient.get<ApiPayload<AdminArticleCategoryListResponse>>(
    "/admin/article-categories",
    {
      params: {
        page: 1,
        limit: 100,
        ...(locale ? { locale } : {}),
      },
    },
  );
  return extractData(response.data);
}

export async function getAdminArticleById(
  articleId: string,
  locale?: string,
): Promise<AdminArticleItemResponse> {
  const response = await httpClient.get<ApiPayload<AdminArticleItemResponse>>(
    `/admin/articles/${articleId}`,
    { params: locale ? { locale } : undefined },
  );
  return extractData(response.data);
}

export async function publishAdminArticle(
  articleId: string,
  locale?: string,
): Promise<AdminArticleItemResponse> {
  const response = await httpClient.patch<ApiPayload<AdminArticleItemResponse>>(
    `/admin/articles/${articleId}/publish`,
    undefined,
    { params: locale ? { locale } : undefined },
  );
  return extractData(response.data);
}

export async function archiveAdminArticle(
  articleId: string,
  locale?: string,
): Promise<AdminArticleItemResponse> {
  const response = await httpClient.patch<ApiPayload<AdminArticleItemResponse>>(
    `/admin/articles/${articleId}/archive`,
    undefined,
    { params: locale ? { locale } : undefined },
  );
  return extractData(response.data);
}

export async function createAdminArticle(
  payload: CreateAdminArticleInput,
): Promise<AdminArticleItemResponse> {
  const response = await httpClient.post<ApiPayload<AdminArticleItemResponse>>(
    "/admin/articles",
    payload,
  );
  return extractData(response.data);
}

export async function updateAdminArticle(
  articleId: string,
  payload: UpdateAdminArticleInput,
): Promise<AdminArticleItemResponse> {
  const response = await httpClient.patch<ApiPayload<AdminArticleItemResponse>>(
    `/admin/articles/${articleId}`,
    payload,
  );
  return extractData(response.data);
}

export async function uploadAdminArticleCover(
  file: File,
): Promise<AdminArticleCoverUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await httpClient.post<ApiPayload<AdminArticleCoverUploadResponse>>(
    "/admin/articles/cover-upload",
    formData,
  );
  return extractData(response.data);
}
