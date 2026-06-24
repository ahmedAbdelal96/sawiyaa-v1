import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  getPractitionerSession,
  getPractitionerSessions,
  getPractitionerSessionSummary,
  markPractitionerSessionCompleted,
  markPractitionerSessionNoShow,
  preparePractitionerSessionRuntime,
  resolvePractitionerSessionJoinContract,
} from "./api";
import type { ListSessionsQuery } from "./types";

export const practitionerSessionQueryKeys = {
  all: ["practitioner-sessions"] as const,
  list: (params?: ListSessionsQuery) =>
    [...practitionerSessionQueryKeys.all, "list", params ?? {}] as const,
  infiniteList: (params?: Omit<ListSessionsQuery, "page">) =>
    [...practitionerSessionQueryKeys.all, "infinite-list", params ?? {}] as const,
  summary: () => [...practitionerSessionQueryKeys.all, "summary"] as const,
  detail: (sessionId: string) =>
    [...practitionerSessionQueryKeys.all, "detail", sessionId] as const,
};

export function usePractitionerSessions(params?: ListSessionsQuery) {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerSessionQueryKeys.list(params),
    queryFn: () => getPractitionerSessions(params),
    enabled,
    staleTime: 30_000,
  });
}

export function usePractitionerSessionSummary() {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerSessionQueryKeys.summary(),
    queryFn: async () => {
      const response = await getPractitionerSessionSummary();
      return response.item;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useInfinitePractitionerSessions(
  params?: Omit<ListSessionsQuery, "page">,
) {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useInfiniteQuery({
    queryKey: practitionerSessionQueryKeys.infiniteList(params),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getPractitionerSessions({
        ...params,
        page: Number(pageParam) || 1,
      }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      if (page >= totalPages) {
        return undefined;
      }

      return page + 1;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function usePractitionerSession(sessionId: string | null) {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerSessionQueryKeys.detail(sessionId ?? ""),
    queryFn: () => getPractitionerSession(sessionId!),
    enabled: enabled && Boolean(sessionId),
    staleTime: 30_000,
  });
}

export function usePreparePractitionerSessionRuntime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      preparePractitionerSessionRuntime(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({
        queryKey: practitionerSessionQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: practitionerSessionQueryKeys.detail(sessionId),
      });
    },
  });
}

export function useResolvePractitionerSessionJoinContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      resolvePractitionerSessionJoinContract(sessionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: practitionerSessionQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: practitionerSessionQueryKeys.detail(data.item.sessionId),
      });
    },
  });
}

export function useMarkPractitionerSessionCompleted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      markPractitionerSessionCompleted(sessionId),
    onSuccess: (data) => {
      queryClient.setQueryData(
        practitionerSessionQueryKeys.detail(data.item.id),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: practitionerSessionQueryKeys.all,
      });
    },
  });
}

export function useMarkPractitionerSessionNoShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => markPractitionerSessionNoShow(sessionId),
    onSuccess: (data) => {
      queryClient.setQueryData(
        practitionerSessionQueryKeys.detail(data.item.id),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: practitionerSessionQueryKeys.all,
      });
    },
  });
}
