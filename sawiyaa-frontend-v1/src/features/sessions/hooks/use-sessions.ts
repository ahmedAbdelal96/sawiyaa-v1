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
  markPractitionerSessionCompleted,
  markPractitionerSessionNoShow,
  getPractitionerSession,
  getPractitionerSessions,
  preparePractitionerSessionRuntime,
  resolvePractitionerSessionJoinContract,
} from "../api/sessions.api";
import type { ListSessionsParams, SessionItem } from "../types/sessions.types";
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
    onSuccess: (updatedSession) => {
      // Update the detail cache immediately
      queryClient.setQueryData(
        patientSessionQueryKeys.detail(updatedSession.id),
        updatedSession,
      );
      // Invalidate list so it reflects the new status
      queryClient.invalidateQueries({ queryKey: patientSessionQueryKeys.all });
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
    onSuccess: (joinItem) => {
      queryClient.invalidateQueries({ queryKey: patientSessionQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: patientSessionQueryKeys.detail(joinItem.sessionId),
      });
    },
  });
}

export function usePreparePatientSessionRuntime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => preparePatientSessionRuntime(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: patientSessionQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: patientSessionQueryKeys.detail(sessionId),
      });
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

export function useMarkPractitionerSessionCompleted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => markPractitionerSessionCompleted(sessionId),
    onSuccess: (updatedSession) => {
      queryClient.setQueryData(
        practitionerSessionQueryKeys.detail(updatedSession.id),
        updatedSession,
      );
      queryClient.invalidateQueries({ queryKey: practitionerSessionQueryKeys.all });
    },
  });
}

export function useMarkPractitionerSessionNoShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => markPractitionerSessionNoShow(sessionId),
    onSuccess: (updatedSession) => {
      queryClient.setQueryData(
        practitionerSessionQueryKeys.detail(updatedSession.id),
        updatedSession,
      );
      queryClient.invalidateQueries({ queryKey: practitionerSessionQueryKeys.all });
    },
  });
}

export function useResolvePractitionerSessionJoinContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => resolvePractitionerSessionJoinContract(sessionId),
    onSuccess: (joinItem) => {
      queryClient.invalidateQueries({ queryKey: practitionerSessionQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: practitionerSessionQueryKeys.detail(joinItem.sessionId),
      });
    },
  });
}

export function usePreparePractitionerSessionRuntime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => preparePractitionerSessionRuntime(sessionId),
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: practitionerSessionQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: practitionerSessionQueryKeys.detail(variables.sessionId),
      });
    },
  });
}

/**
 * Mutation hook for creating a scheduled patient session.
 * Returns PENDING_PAYMENT on success — not a confirmed/paid booking.
 * Callers must communicate the PENDING_PAYMENT status honestly to the user.
 */
export function useCreateScheduledSession() {
  return useMutation({
    mutationFn: createScheduledSession,
  });
}
