import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createPublicAcademyEnrollment,
  getPublicAcademyCourseBySlug,
  getPublicAcademyCourses,
  getPublicAcademyEnrollment,
} from "./api";
import type { CreateAcademyEnrollmentInput, ListAcademyCoursesParams } from "./types";

export const academyQueryKeys = {
  all: ["academy"] as const,
  courses: (params?: ListAcademyCoursesParams, scopeKey?: string | null) =>
    [...academyQueryKeys.all, "courses", scopeKey ?? "guest", params ?? {}] as const,
  infiniteCourses: (params?: ListAcademyCoursesParams, scopeKey?: string | null) =>
    [...academyQueryKeys.all, "infinite-courses", scopeKey ?? "guest", params ?? {}] as const,
  course: (slug: string, scopeKey?: string | null) =>
    [...academyQueryKeys.all, "course", scopeKey ?? "guest", slug] as const,
  enrollment: (id: string, token: string) =>
    [...academyQueryKeys.all, "enrollment", id, token] as const,
};

export function usePublicAcademyCourses(
  params?: ListAcademyCoursesParams,
  options?: { cacheScopeKey?: string | null },
) {
  return useQuery({
    queryKey: academyQueryKeys.courses(params, options?.cacheScopeKey),
    queryFn: () => getPublicAcademyCourses(params),
    staleTime: 60_000,
  });
}

export function useInfinitePublicAcademyCourses(
  params?: ListAcademyCoursesParams,
  options?: { cacheScopeKey?: string | null },
) {
  const resolvedParams = params ?? {};

  return useInfiniteQuery({
    queryKey: academyQueryKeys.infiniteCourses(resolvedParams, options?.cacheScopeKey),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getPublicAcademyCourses({
        ...resolvedParams,
        page: Number(pageParam) || 1,
      }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      if (page >= totalPages) {
        return undefined;
      }

      return page + 1;
    },
    staleTime: 60_000,
  });
}

export function usePublicAcademyCourse(
  slug: string | null,
  options?: { cacheScopeKey?: string | null },
) {
  return useQuery({
    queryKey: academyQueryKeys.course(slug ?? "", options?.cacheScopeKey),
    queryFn: () => getPublicAcademyCourseBySlug(slug!),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
}

export function useCreatePublicAcademyEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      input,
    }: {
      slug: string;
      input: CreateAcademyEnrollmentInput;
    }) => createPublicAcademyEnrollment(slug, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academyQueryKeys.all });
    },
  });
}

export function usePublicAcademyEnrollment(
  id: string | null,
  token: string | null,
) {
  return useQuery({
    queryKey: academyQueryKeys.enrollment(id ?? "", token ?? ""),
    queryFn: () => getPublicAcademyEnrollment(id!, token!),
    enabled: Boolean(id) && Boolean(token),
    staleTime: 30_000,
  });
}
