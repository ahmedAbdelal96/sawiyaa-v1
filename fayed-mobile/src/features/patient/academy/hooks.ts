import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPublicAcademyEnrollment,
  getPublicAcademyCourseBySlug,
  getPublicAcademyCourses,
  getPublicAcademyEnrollment,
} from "./api";
import type { CreateAcademyEnrollmentInput, ListAcademyCoursesParams } from "./types";

export const academyQueryKeys = {
  all: ["academy"] as const,
  courses: (params?: ListAcademyCoursesParams) =>
    [...academyQueryKeys.all, "courses", params ?? {}] as const,
  course: (slug: string) => [...academyQueryKeys.all, "course", slug] as const,
  enrollment: (id: string, token: string) =>
    [...academyQueryKeys.all, "enrollment", id, token] as const,
};

export function usePublicAcademyCourses(params?: ListAcademyCoursesParams) {
  return useQuery({
    queryKey: academyQueryKeys.courses(params),
    queryFn: () => getPublicAcademyCourses(params),
    staleTime: 60_000,
  });
}

export function usePublicAcademyCourse(slug: string | null) {
  return useQuery({
    queryKey: academyQueryKeys.course(slug ?? ""),
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
