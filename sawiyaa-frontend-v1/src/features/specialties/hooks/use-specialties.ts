import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSpecialtyCategory,
  createSpecialty,
  getSpecialtyBySlug,
  listAdminSpecialtyCategories,
  listAdminSpecialties,
  listSpecialties,
  listSpecialtyCategories,
  toggleSpecialtyStatus,
  updateSpecialtyCategory,
  updateSpecialty,
} from "../api/specialties.api";
import { specialtiesQueryKeys } from "../constants/query-keys";
import type {
  CreateSpecialtyCategoryRequest,
  CreateSpecialtyRequest,
  ListSpecialtiesParams,
  ToggleSpecialtyStatusRequest,
  UpdateSpecialtyCategoryRequest,
  UpdateSpecialtyRequest,
} from "../types/specialties.types";

/**
 * Query hook for public specialties listing.
 */
export function useSpecialties(params?: ListSpecialtiesParams, enabled = true) {
  return useQuery({
    queryKey: specialtiesQueryKeys.list(params),
    queryFn: () => listSpecialties(params),
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });
}

/**
 * Query hook for admin specialties listing (active + inactive).
 */
export function useAdminSpecialties(params?: ListSpecialtiesParams, enabled = true) {
  return useQuery({
    queryKey: specialtiesQueryKeys.adminList(params),
    queryFn: () => listAdminSpecialties(params),
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * Query hook for specialty details by slug.
 */
export function useSpecialtyBySlug(slug?: string) {
  return useQuery({
    queryKey: specialtiesQueryKeys.bySlug(slug ?? ""),
    queryFn: () => getSpecialtyBySlug(slug as string),
    enabled: Boolean(slug),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });
}

/**
 * Query hook for specialty categories baseline endpoint.
 */
export function useSpecialtyCategories(enabled = true) {
  return useQuery({
    queryKey: specialtiesQueryKeys.categories(),
    queryFn: listSpecialtyCategories,
    enabled,
    staleTime: 10 * 60_000,
    gcTime: 20 * 60_000,
  });
}

/**
 * Query hook for admin category listing (active + inactive).
 */
export function useAdminSpecialtyCategories(
  params?: ListSpecialtiesParams,
  enabled = true
) {
  return useQuery({
    queryKey: specialtiesQueryKeys.adminCategories(params),
    queryFn: () => listAdminSpecialtyCategories(params),
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * Admin mutation for creating specialties.
 * Invalidates public/admin catalogs to keep all selectors consistent.
 */
export function useCreateSpecialty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSpecialtyRequest) => createSpecialty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: specialtiesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: specialtiesQueryKeys.adminAll });
      queryClient.invalidateQueries({ queryKey: ["practitioners"] });
    },
  });
}

/**
 * Admin mutation for creating primary specialty categories.
 * Keeps category selectors fresh for specialty creation flows.
 */
export function useCreateSpecialtyCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSpecialtyCategoryRequest) => createSpecialtyCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: specialtiesQueryKeys.categories() });
      queryClient.invalidateQueries({ queryKey: specialtiesQueryKeys.adminCategories() });
      queryClient.invalidateQueries({ queryKey: specialtiesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: specialtiesQueryKeys.adminAll });
      queryClient.invalidateQueries({ queryKey: ["practitioners"] });
    },
  });
}

/**
 * Admin mutation for updating primary specialty categories.
 */
export function useUpdateSpecialtyCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSpecialtyCategoryRequest;
    }) => updateSpecialtyCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: specialtiesQueryKeys.categories() });
      queryClient.invalidateQueries({ queryKey: specialtiesQueryKeys.adminCategories() });
      queryClient.invalidateQueries({ queryKey: specialtiesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: specialtiesQueryKeys.adminAll });
      queryClient.invalidateQueries({ queryKey: ["practitioners"] });
    },
  });
}

/**
 * Admin mutation for updating specialties.
 */
export function useUpdateSpecialty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSpecialtyRequest;
    }) => updateSpecialty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: specialtiesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: specialtiesQueryKeys.adminAll });
      queryClient.invalidateQueries({ queryKey: ["practitioners"] });
    },
  });
}

/**
 * Admin mutation for toggling specialty availability.
 */
export function useToggleSpecialtyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ToggleSpecialtyStatusRequest;
    }) => toggleSpecialtyStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: specialtiesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: specialtiesQueryKeys.adminAll });
      queryClient.invalidateQueries({ queryKey: ["practitioners"] });
    },
  });
}
