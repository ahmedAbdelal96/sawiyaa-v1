import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  CreateScheduledSessionInput,
  CreateSessionResponseData,
  ListSessionsParams,
  SessionJoinResponseData,
  SessionItem,
  SessionRoomCloseResponseData,
  SessionCancellationPreviewResponseData,
  SessionRuntimeResponseData,
  SessionSummary,
  SessionsListResponseData,
} from "../types/sessions.types";

/**
 * Creates a new scheduled session in PENDING_PAYMENT status.
 * Requires an authenticated PATIENT account (httpClient sends access token cookie).
 *
 * POST /patients/me/sessions
 *
 * Validation:
 *   - practitionerSlug: must be a publicly visible practitioner
 *   - scheduledStartAt: ISO 8601 UTC, must be in the future
 *   - durationMinutes: 30 or 60
 *   - sessionMode: VIDEO (default, currently the only supported mode)
 *
 * Error codes from backend:
 *   - 400: invalid datetime, past start, invalid duration
 *   - 404: practitioner not found or not bookable
 *   - 409: scheduling conflict (practitioner or patient already has a blocking session)
 *   - 403: caller is not an active patient
 */
/**
 * Fetches a single patient-owned session by ID.
 *
 * GET /patients/me/sessions/:sessionId
 */
export async function getPatientSession(sessionId: string): Promise<SessionItem> {
  const response = await httpClient.get<ApiPayload<CreateSessionResponseData>>(
    `/patients/me/sessions/${sessionId}`,
  );
  return extractData(response.data).item;
}

/**
 * Lists patient-owned sessions with optional status filter and pagination.
 *
 * GET /patients/me/sessions
 */
export async function getPatientSessions(
  params?: ListSessionsParams,
): Promise<SessionsListResponseData> {
  const response = await httpClient.get<ApiPayload<SessionsListResponseData>>(
    "/patients/me/sessions",
    { params },
  );
  return extractData(response.data);
}

/**
 * Returns a patient session summary grouped by lifecycle and action needs.
 *
 * GET /patients/me/sessions/summary
 */
export async function getPatientSessionSummary(): Promise<SessionSummary> {
  const response = await httpClient.get<ApiPayload<SessionSummary>>(
    "/patients/me/sessions/summary",
  );
  return extractData(response.data);
}

/**
 * Cancels a patient-owned session. Reason is optional.
 * Only valid for CONFIRMED and UPCOMING sessions.
 *
 * POST /patients/me/sessions/:sessionId/cancel
 */
export async function cancelPatientSession(
  sessionId: string,
  reason?: string,
): Promise<SessionItem> {
  const response = await httpClient.post<ApiPayload<CreateSessionResponseData>>(
    `/patients/me/sessions/${sessionId}/cancel`,
    reason ? { reason } : {},
  );
  return extractData(response.data).item;
}

/**
 * Returns a contract-backed cancellation financial preview before confirmation.
 *
 * GET /patients/me/sessions/:sessionId/cancel-preview
 */
export async function previewPatientSessionCancellation(
  sessionId: string,
) {
  const response = await httpClient.get<ApiPayload<SessionCancellationPreviewResponseData>>(
    `/patients/me/sessions/${sessionId}/cancel-preview`,
  );
  return extractData(response.data).item;
}

/**
 * Resolves the patient join contract for a video session.
 *
 * GET /patients/me/sessions/:sessionId/runtime/join
 */
export async function resolvePatientSessionJoinContract(
  sessionId: string,
) {
  const response = await httpClient.get<ApiPayload<SessionJoinResponseData>>(
    `/patients/me/sessions/${sessionId}/runtime/join`,
  );
  return extractData(response.data).item;
}

/**
 * Prepares the patient runtime contract for a video session.
 *
 * POST /patients/me/sessions/:sessionId/runtime/prepare
 */
export async function preparePatientSessionRuntime(sessionId: string) {
  const response = await httpClient.post<ApiPayload<SessionRuntimeResponseData>>(
    `/patients/me/sessions/${sessionId}/runtime/prepare`,
    {},
  );
  return extractData(response.data).item;
}

/**
 * Lists practitioner-owned sessions with optional status filter and pagination.
 *
 * GET /practitioners/me/sessions
 */
export async function getPractitionerSessions(
  params?: ListSessionsParams,
): Promise<SessionsListResponseData> {
  const response = await httpClient.get<ApiPayload<SessionsListResponseData>>(
    "/practitioners/me/sessions",
    { params },
  );
  return extractData(response.data);
}

/**
 * Fetches a single practitioner-owned session by ID.
 *
 * GET /practitioners/me/sessions/:sessionId
 */
export async function getPractitionerSession(sessionId: string): Promise<SessionItem> {
  const response = await httpClient.get<ApiPayload<CreateSessionResponseData>>(
    `/practitioners/me/sessions/${sessionId}`,
  );
  return extractData(response.data).item;
}

/**
 * Resolves the practitioner join contract for a video session.
 *
 * GET /practitioners/me/sessions/:sessionId/runtime/join
 */
export async function resolvePractitionerSessionJoinContract(
  sessionId: string,
) {
  const response = await httpClient.get<ApiPayload<SessionJoinResponseData>>(
    `/practitioners/me/sessions/${sessionId}/runtime/join`,
  );
  return extractData(response.data).item;
}

/**
 * Prepares the practitioner runtime contract for a video session.
 *
 * POST /practitioners/me/sessions/:sessionId/runtime/prepare
 */
export async function preparePractitionerSessionRuntime(sessionId: string) {
  const response = await httpClient.post<ApiPayload<SessionRuntimeResponseData>>(
    `/practitioners/me/sessions/${sessionId}/runtime/prepare`,
    {},
  );
  return extractData(response.data).item;
}

/**
 * Closes a practitioner-owned video room.
 * Requires a short reason before the scheduled end time.
 */
export async function closePractitionerSessionRuntime(
  sessionId: string,
  payload: { reason?: string; note?: string } = {},
): Promise<SessionRoomCloseResponseData["item"]> {
  const response = await httpClient.post<ApiPayload<SessionRoomCloseResponseData>>(
    `/practitioners/me/sessions/${sessionId}/runtime/close`,
    payload,
  );
  return extractData(response.data).item;
}

/**
 * Marks a practitioner-owned session as completed.
 *
 * POST /practitioners/me/sessions/:sessionId/mark-completed
 */
export async function markPractitionerSessionCompleted(
  sessionId: string,
): Promise<SessionItem> {
  const response = await httpClient.post<ApiPayload<CreateSessionResponseData>>(
    `/practitioners/me/sessions/${sessionId}/mark-completed`,
    {},
  );
  return extractData(response.data).item;
}

/**
 * Marks a practitioner-owned session as patient no-show.
 *
 * POST /practitioners/me/sessions/:sessionId/mark-no-show
 */
export async function markPractitionerSessionNoShow(
  sessionId: string,
): Promise<SessionItem> {
  const response = await httpClient.post<ApiPayload<CreateSessionResponseData>>(
    `/practitioners/me/sessions/${sessionId}/mark-no-show`,
    {},
  );
  return extractData(response.data).item;
}

export async function createScheduledSession(
  data: CreateScheduledSessionInput,
): Promise<CreateSessionResponseData> {
  const response = await httpClient.post<ApiPayload<CreateSessionResponseData>>(
    "/patients/me/sessions",
    data,
  );
  return extractData(response.data);
}
