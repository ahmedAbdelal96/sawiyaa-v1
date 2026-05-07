"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveAdminAcademyCourse,
  createAdminAcademyCourse,
  createAdminAcademyCourseLecture,
  createPublicAcademyEnrollment,
  getAdminAcademyCourse,
  getAdminAcademyCourses,
  getAdminAcademyEnrollments,
  getPublicAcademyCourseBySlug,
  getPublicAcademyCourses,
  getPublicAcademyEnrollment,
  publishAdminAcademyCourse,
  updateAdminAcademyCourse,
} from "../api/academy.api";
import type {
  AcademyEnrollmentItem,
  AcademyCourseItem,
  AcademyCoursesListData,
  AcademyEnrollmentsListData,
  CreateAcademyCourseInput,
  CreateAcademyCourseLectureInput,
  CreateAcademyEnrollmentInput,
  ListAcademyCoursesParams,
  ListAdminAcademyCoursesParams,
  ListAdminAcademyEnrollmentsParams,
  UpdateAcademyCourseInput,
} from "../types/academy.types";

export const academyQueryKeys = {
  all: ["academy"] as const,
  publicCourses: (params?: ListAcademyCoursesParams) =>
    [...academyQueryKeys.all, "public-courses", params ?? {}] as const,
  publicCourse: (slug: string) => [...academyQueryKeys.all, "public-course", slug] as const,
  publicEnrollment: (enrollmentId: string, token: string) =>
    [...academyQueryKeys.all, "public-enrollment", enrollmentId, token] as const,
  adminCourses: (params?: ListAdminAcademyCoursesParams) =>
    [...academyQueryKeys.all, "admin-courses", params ?? {}] as const,
  adminCourse: (courseId: string) =>
    [...academyQueryKeys.all, "admin-course", courseId] as const,
  adminEnrollments: (params?: ListAdminAcademyEnrollmentsParams) =>
    [...academyQueryKeys.all, "admin-enrollments", params ?? {}] as const,
};

export function usePublicAcademyCourses(params?: ListAcademyCoursesParams) {
  return useQuery({
    queryKey: academyQueryKeys.publicCourses(params),
    queryFn: () => getPublicAcademyCourses(params),
    staleTime: 30_000,
  });
}

export function usePublicAcademyCourse(slug: string | null) {
  return useQuery({
    queryKey: academyQueryKeys.publicCourse(slug ?? ""),
    queryFn: () => getPublicAcademyCourseBySlug(slug!),
    enabled: Boolean(slug),
    staleTime: 30_000,
  });
}

export function useCreatePublicAcademyEnrollment() {
  return useMutation({
    mutationFn: ({
      slug,
      input,
    }: {
      slug: string;
      input: CreateAcademyEnrollmentInput;
    }) => createPublicAcademyEnrollment(slug, input),
  });
}

export function usePublicAcademyEnrollment(enrollmentId: string | null, token: string | null) {
  return useQuery({
    queryKey: academyQueryKeys.publicEnrollment(enrollmentId ?? "", token ?? ""),
    queryFn: () => getPublicAcademyEnrollment(enrollmentId!, token!),
    enabled: Boolean(enrollmentId && token),
    staleTime: 30_000,
  });
}

export function useAdminAcademyCourses(params?: ListAdminAcademyCoursesParams) {
  return useQuery({
    queryKey: academyQueryKeys.adminCourses(params),
    queryFn: () => getAdminAcademyCourses(params),
    staleTime: 30_000,
  });
}

export function useAdminAcademyCourse(courseId: string | null) {
  return useQuery({
    queryKey: academyQueryKeys.adminCourse(courseId ?? ""),
    queryFn: () => getAdminAcademyCourse(courseId!),
    enabled: Boolean(courseId),
    staleTime: 30_000,
  });
}

export function useAdminAcademyEnrollments(params?: ListAdminAcademyEnrollmentsParams) {
  return useQuery({
    queryKey: academyQueryKeys.adminEnrollments(params),
    queryFn: () => getAdminAcademyEnrollments(params),
    staleTime: 30_000,
  });
}

export function useCreateAdminAcademyCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAcademyCourseInput) => createAdminAcademyCourse(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academyQueryKeys.adminCourses() });
    },
  });
}

export function useUpdateAdminAcademyCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      courseId,
      input,
    }: {
      courseId: string;
      input: UpdateAcademyCourseInput;
    }) => updateAdminAcademyCourse(courseId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: academyQueryKeys.adminCourse(variables.courseId),
      });
      queryClient.invalidateQueries({ queryKey: academyQueryKeys.adminCourses() });
    },
  });
}

export function usePublishAdminAcademyCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) => publishAdminAcademyCourse(courseId),
    onSuccess: (_data, courseId) => {
      queryClient.invalidateQueries({ queryKey: academyQueryKeys.adminCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: academyQueryKeys.adminCourses() });
    },
  });
}

export function useArchiveAdminAcademyCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) => archiveAdminAcademyCourse(courseId),
    onSuccess: (_data, courseId) => {
      queryClient.invalidateQueries({ queryKey: academyQueryKeys.adminCourse(courseId) });
      queryClient.invalidateQueries({ queryKey: academyQueryKeys.adminCourses() });
    },
  });
}

export function useCreateAdminAcademyCourseLecture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      courseId,
      input,
    }: {
      courseId: string;
      input: CreateAcademyCourseLectureInput;
    }) => createAdminAcademyCourseLecture(courseId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: academyQueryKeys.adminCourse(variables.courseId),
      });
      queryClient.invalidateQueries({ queryKey: academyQueryKeys.adminCourses() });
    },
  });
}
