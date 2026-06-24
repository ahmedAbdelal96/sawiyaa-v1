"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminHelpCategory,
  createAdminHelpQuestion,
  deleteAdminHelpCategory,
  deleteAdminHelpQuestion,
  fetchPublicHelp,
  reorderAdminHelpCategories,
  reorderAdminHelpQuestions,
  searchPublicHelp,
  updateAdminHelpCategory,
  updateAdminHelpQuestion,
  listAdminHelpCategories,
  listAdminHelpQuestions,
} from "../api/help.api";
import type {
  ReorderHelpCategoriesInput,
  ReorderHelpQuestionsInput,
  UpsertHelpCategoryInput,
  UpsertHelpQuestionInput,
} from "../types/help.types";

export const helpQueryKeys = {
  all: ["help"] as const,
  adminCategories: () => [...helpQueryKeys.all, "admin-categories"] as const,
  adminQuestions: () => [...helpQueryKeys.all, "admin-questions"] as const,
  publicHelp: (query: string) => [...helpQueryKeys.all, "public", query.trim()] as const,
};

export function useAdminHelpCategories() {
  return useQuery({
    queryKey: helpQueryKeys.adminCategories(),
    queryFn: listAdminHelpCategories,
    staleTime: 20_000,
  });
}

export function useAdminHelpQuestions() {
  return useQuery({
    queryKey: helpQueryKeys.adminQuestions(),
    queryFn: listAdminHelpQuestions,
    staleTime: 20_000,
  });
}

export function useCreateAdminHelpCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertHelpCategoryInput) => createAdminHelpCategory(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: helpQueryKeys.adminCategories() });
    },
  });
}

export function useUpdateAdminHelpCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpsertHelpCategoryInput }) =>
      updateAdminHelpCategory(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: helpQueryKeys.adminCategories() });
    },
  });
}

export function useDeleteAdminHelpCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminHelpCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: helpQueryKeys.adminCategories() });
      void queryClient.invalidateQueries({ queryKey: helpQueryKeys.adminQuestions() });
    },
  });
}

export function useReorderAdminHelpCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderHelpCategoriesInput) => reorderAdminHelpCategories(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: helpQueryKeys.adminCategories() });
    },
  });
}

export function useCreateAdminHelpQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertHelpQuestionInput) => createAdminHelpQuestion(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: helpQueryKeys.adminQuestions() });
    },
  });
}

export function useUpdateAdminHelpQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpsertHelpQuestionInput }) =>
      updateAdminHelpQuestion(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: helpQueryKeys.adminQuestions() });
    },
  });
}

export function useDeleteAdminHelpQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminHelpQuestion(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: helpQueryKeys.adminQuestions() });
    },
  });
}

export function useReorderAdminHelpQuestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderHelpQuestionsInput) => reorderAdminHelpQuestions(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: helpQueryKeys.adminQuestions() });
    },
  });
}

export function usePublicHelp(query: string) {
  return useQuery({
    queryKey: helpQueryKeys.publicHelp(query),
    queryFn: () => (query.trim() ? searchPublicHelp(query) : fetchPublicHelp()),
    staleTime: 20_000,
  });
}
