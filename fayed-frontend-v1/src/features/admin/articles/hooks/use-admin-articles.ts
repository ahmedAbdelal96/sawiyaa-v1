"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveAdminArticle,
  createAdminArticle,
  getAdminArticleCategories,
  getAdminArticleById,
  getAdminArticles,
  publishAdminArticle,
  uploadAdminArticleCover,
  updateAdminArticle,
} from "../api/admin-articles.api";
import { adminArticlesQueryKeys } from "../constants/query-keys";
import type {
  AdminArticleListParams,
  CreateAdminArticleInput,
  UpdateAdminArticleInput,
} from "../types/admin-articles.types";

export function useAdminArticles(params: AdminArticleListParams) {
  return useQuery({
    queryKey: adminArticlesQueryKeys.list(params),
    queryFn: () => getAdminArticles(params),
    staleTime: 20_000,
  });
}

export function useAdminArticleById(articleId?: string, locale?: string) {
  return useQuery({
    queryKey: adminArticlesQueryKeys.detail(articleId ?? "", locale),
    queryFn: () => getAdminArticleById(articleId ?? "", locale),
    enabled: Boolean(articleId),
    staleTime: 20_000,
  });
}

export function useAdminArticleCategories(locale?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: adminArticlesQueryKeys.categories(locale),
    queryFn: () => getAdminArticleCategories(locale),
    enabled,
    staleTime: 30_000,
  });
}

export function usePublishAdminArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ articleId, locale }: { articleId: string; locale?: string }) =>
      publishAdminArticle(articleId, locale),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminArticlesQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: adminArticlesQueryKeys.detail(variables.articleId, variables.locale),
      });
    },
  });
}

export function useArchiveAdminArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ articleId, locale }: { articleId: string; locale?: string }) =>
      archiveAdminArticle(articleId, locale),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminArticlesQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: adminArticlesQueryKeys.detail(variables.articleId, variables.locale),
      });
    },
  });
}

export function useCreateAdminArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAdminArticleInput) => createAdminArticle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminArticlesQueryKeys.all });
    },
  });
}

export function useUpdateAdminArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      articleId,
      payload,
    }: {
      articleId: string;
      payload: UpdateAdminArticleInput;
    }) => updateAdminArticle(articleId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminArticlesQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: adminArticlesQueryKeys.detail(variables.articleId, payloadLocale(variables.payload)),
      });
    },
  });
}

export function useUploadAdminArticleCover() {
  return useMutation({
    mutationFn: (file: File) => uploadAdminArticleCover(file),
  });
}

function payloadLocale(payload: UpdateAdminArticleInput): string | undefined {
  return typeof payload.locale === "string" ? payload.locale : undefined;
}
