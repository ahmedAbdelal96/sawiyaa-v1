import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelPatientSession,
  closePractitionerSessionRuntime,
  createScheduledSession,
  getPatientSession,
  getPatientSessions,
  getPatientSessionSummary,
  previewPatientSessionCancellation,
  preparePatientSessionRuntime,
  resolvePatientSessionJoinContract,
  markPractitionerSessionNoShow,
  getPractitionerSession,
  getPractitionerSessions,
  preparePractitionerSessionRuntime,
  resolvePractitionerSessionJoinContract,
  getMyNextSession,
} from "../api/sessions.api";
import type { ListSessionsParams, NextSession, SessionItem } from "../types/sessions.types";
import type { SessionSummary } from "../types/sessions.types";

function sanitizeListSessionsParams(params?: ListSessionsParams): ListSessionsParams | undefined {
  if (!params) return undefined;

  const limit = typeof params.limit === "number" ? Math.min(params.limit, 50) : params.limit;
  return { ...params, limit };
}

export const patientSessionQueryKeys = {
  all: ["patient-sessions"] as const,
  list: (params?: ListSessionsParams) =>
    [...patientSessionQueryKeys.all, "list", params ?? {}] as const,
  detail: (sessionId: string) => [...patientSessionQueryKeys.all, sessionId] as const,
};

export const nextSessionQueryKey = ["my-next-session"] as const;

/** Every lifecycle/runtime mutation can affect both participants, next-session and admin projections. */
async function invalidateOperationalSessionViews(queryClient: ReturnType<typeof useQueryClient>, sessionId?: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: patientSessionQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: practitionerSessionQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: patientSessionSummaryQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: nextSessionQueryKey }),
    queryClient.invalidateQueries({ queryKey: ["admin-sessions"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-session-runtime"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "session-resolution"] }),
    queryClient.invalidateQueries({ queryKey: ["patient-journey"] }),
    queryClient.invalidateQueries({ queryKey: ["package-purchases"] }),
    ...(sessionId ? [
      queryClient.invalidateQueries({ queryKey: patientSessionQueryKeys.detail(sessionId) }),
      queryClient.invalidateQueries({ queryKey: practitionerSessionQueryKeys.detail(sessionId) }),
    ] : []),
  ]);
}

export function useMyNextSession() {
  return useQuery<NextSession | null>({
    queryKey: nextSessionQueryKey,
    queryFn: getMyNextSession,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
}

type PatientSessionExtraOptions = {
  staleTime?: number;
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
  meta?: Record<string, unknown>;
  refetchInterval?: number | false | ((query: { state: { data: SessionItem | undefined } }) => number | false);
  refetchIntervalInBackground?: boolean;
};

/**
 * Fetches a single patient-owned session by ID.
 * Accepts optional extra React Query options (e.g. refetchInterval for polling).
 */
export function usePatientSession(
  sessionId: string | null,
  extraOptions?: PatientSessionExtraOptions,
) {
  return useQuery<SessionItem>({
    queryKey: patientSessionQueryKeys.detail(sessionId ?? ""),
    queryFn: () => getPatientSession(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 30_000,
    ...extraOptions,
  });
}

/**
 * Fetches the patient's session list with optional filter and pagination.
 */
export function usePatientSessions(params?: ListSessionsParams) {
  const safeParams = sanitizeListSessionsParams(params);
  return useQuery({
    queryKey: patientSessionQueryKeys.list(safeParams),
    queryFn: () => getPatientSessions(safeParams),
    staleTime: 30_000,
  });
}

export const patientSessionSummaryQueryKeys = {
  all: ["patient-session-summary"] as const,
};

export function usePatientSessionSummary() {
  return useQuery<SessionSummary>({
    queryKey: patientSessionSummaryQueryKeys.all,
    queryFn: getPatientSessionSummary,
    staleTime: 30_000,
  });
}

/**
 * Mutation hook for cancelling a patient-owned session.
 * Invalidates both list and detail queries on success.
 */
export function useCancelPatientSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason?: string }) =>
      cancelPatientSession(sessionId, reason),
    onSuccess: async (updatedSession) => {
      // Update the detail cache immediately
      queryClient.setQueryData(
        patientSessionQueryKeys.detail(updatedSession.id),
        updatedSession,
      );
      // Invalidate list so it reflects the new status
      await invalidateOperationalSessionViews(queryClient, updatedSession.id);
    },
  });
}

export function usePreviewPatientSessionCancellation() {
  return useMutation({
    mutationFn: (sessionId: string) => previewPatientSessionCancellation(sessionId),
  });
}

export function useResolvePatientSessionJoinContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => resolvePatientSessionJoinContract(sessionId),
    onSuccess: async (joinItem) => {
      await invalidateOperationalSessionViews(queryClient, joinItem.sessionId);
    },
  });
}

export function usePreparePatientSessionRuntime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => preparePatientSessionRuntime(sessionId),
    onSuccess: async (_, sessionId) => {
      await invalidateOperationalSessionViews(queryClient, sessionId);
    },
  });
}

/** Query keys for practitioner session queries. */
export const practitionerSessionQueryKeys = {
  all: ["practitioner-sessions"] as const,
  list: (params?: ListSessionsParams) =>
    [...practitionerSessionQueryKeys.all, "list", params ?? {}] as const,
  detail: (sessionId: string) =>
    [...practitionerSessionQueryKeys.all, sessionId] as const,
};

/**
 * Fetches the practitioner's session list with optional filter and pagination.
 *
 * GET /practitioners/me/sessions
 */
export function usePractitionerSessions(params?: ListSessionsParams) {
  const safeParams = sanitizeListSessionsParams(params);
  return useQuery({
    queryKey: practitionerSessionQueryKeys.list(safeParams),
    queryFn: () => getPractitionerSessions(safeParams),
    staleTime: 30_000,
  });
}

/**
 * Fetches a single practitioner-owned session by ID.
 *
 * GET /practitioners/me/sessions/:id
 */
export function usePractitionerSession(sessionId: string | null) {
  return useQuery<SessionItem>({
    queryKey: practitionerSessionQueryKeys.detail(sessionId ?? ""),
    queryFn: () => getPractitionerSession(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 30_000,
  });
}

export function useMarkPractitionerSessionNoShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => markPractitionerSessionNoShow(sessionId),
    onSuccess: async (updatedSession) => {
      queryClient.setQueryData(
        practitionerSessionQueryKeys.detail(updatedSession.id),
        updatedSession,
      );
      await invalidateOperationalSessionViews(queryClient, updatedSession.id);
    },
  });
}

export function useResolvePractitionerSessionJoinContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => resolvePractitionerSessionJoinContract(sessionId),
    onSuccess: async (joinItem) => {
      await invalidateOperationalSessionViews(queryClient, joinItem.sessionId);
    },
  });
}

export function usePreparePractitionerSessionRuntime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => preparePractitionerSessionRuntime(sessionId),
    onSuccess: async (_, sessionId) => {
      await invalidateOperationalSessionViews(queryClient, sessionId);
    },
  });
}

export function useClosePractitionerSessionRuntime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      reason,
      note,
    }: {
      sessionId: string;
      reason?: string;
      note?: string;
    }) => closePractitionerSessionRuntime(sessionId, { reason, note }),
    onSuccess: async (_, variables) => {
      await invalidateOperationalSessionViews(queryClient, variables.sessionId);
    },
  });
}

/**
 * Mutation hook for creating a scheduled patient session.
 * Returns PENDING_PAYMENT on success — not a confirmed/paid booking.
 * Callers must communicate the PENDING_PAYMENT status honestly to the user.
 */
export function useCreateScheduledSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createScheduledSession,
    onSuccess: async (created) => invalidateOperationalSessionViews(queryClient, created.item.id),
  });
}
