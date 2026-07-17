import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPublicAcademyProgramEnrollment, getPublicAcademyProgramBySlug, getPublicAcademyProgramEnrollment, getPublicAcademyPrograms } from "./api";
import type { CreateAcademyProgramEnrollmentInput, ListAcademyProgramsParams } from "./types";
export const academyQueryKeys = {
  all: ["academy"] as const,
  programs: (params?: ListAcademyProgramsParams, scopeKey?: string | null) => [...academyQueryKeys.all, "programs", scopeKey ?? "guest", params ?? {}] as const,
  infinitePrograms: (params?: ListAcademyProgramsParams, scopeKey?: string | null) => [...academyQueryKeys.all, "infinite-programs", scopeKey ?? "guest", params ?? {}] as const,
  program: (slug: string, scopeKey?: string | null) => [...academyQueryKeys.all, "program", scopeKey ?? "guest", slug] as const,
  enrollment: (id: string, token: string) => [...academyQueryKeys.all, "program-enrollment", id, token] as const,
};
export function useInfinitePublicAcademyPrograms(params?: ListAcademyProgramsParams, options?: { cacheScopeKey?: string | null }) {
  const resolvedParams = params ?? {};
  return useInfiniteQuery({
    queryKey: academyQueryKeys.infinitePrograms(resolvedParams, options?.cacheScopeKey), initialPageParam: 1,
    queryFn: ({ pageParam }) => getPublicAcademyPrograms({ ...resolvedParams, page: Number(pageParam) || 1 }),
    getNextPageParam: (lastPage) => lastPage.pagination.page >= lastPage.pagination.totalPages ? undefined : lastPage.pagination.page + 1,
    staleTime: 60_000,
  });
}
export function usePublicAcademyProgram(slug: string | null, options?: { cacheScopeKey?: string | null }) {
  return useQuery({ queryKey: academyQueryKeys.program(slug ?? "", options?.cacheScopeKey), queryFn: () => getPublicAcademyProgramBySlug(slug!), enabled: Boolean(slug), staleTime: 60_000 });
}
export function useCreatePublicAcademyProgramEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ slug, input }: { slug: string; input: CreateAcademyProgramEnrollmentInput }) => createPublicAcademyProgramEnrollment(slug, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: academyQueryKeys.all }) });
}
export function usePublicAcademyProgramEnrollment(id: string | null, token: string | null) {
  return useQuery({ queryKey: academyQueryKeys.enrollment(id ?? "", token ?? ""), queryFn: () => getPublicAcademyProgramEnrollment(id!, token!), enabled: Boolean(id) && Boolean(token), staleTime: 30_000 });
}
