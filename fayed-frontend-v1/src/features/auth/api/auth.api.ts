import httpClient, { tokenManager } from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import { clearAuthStore, seedAuthStore } from "@/stores/auth-store";
import type {
  AdminLoginRequest,
  AuthSuccessResponse,
  CurrentAuthUserResponse,
  MessageResponse,
  OtpChallengeResponse,
  PatientGoogleAuthRequest,
  PatientLoginRequest,
  PatientRegisterRequest,
  PractitionerForgotPasswordRequest,
  PractitionerLoginRequest,
  PractitionerRegisterRequest,
  PractitionerRegistrationResponse,
  PractitionerResetPasswordRequest,
  PractitionerVerifyOtpRequest,
  RefreshTokenRequest,
} from "../types/auth.types";

function isBrowserRuntime() {
  return typeof window !== "undefined";
}

/**
 * Uses the stored refresh token as bearer for refresh-guarded endpoints.
 * Backend refresh/logout endpoints require refresh-token context, not access-token context.
 */
function buildRefreshAuthHeader(refreshToken?: string) {
  const token =
    refreshToken ?? (isBrowserRuntime() ? tokenManager.getRefreshToken() : undefined);
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

/**
 * Normalizes auth success side effects in one place.
 * This keeps token persistence behavior identical across patient/practitioner/admin flows.
 * In non-browser runtimes we intentionally skip cookie/localStorage side effects.
 */
function storeAuthSession(payload: AuthSuccessResponse) {
  if (!isBrowserRuntime()) return;
  tokenManager.setTokens(payload.tokens.accessToken, payload.tokens.refreshToken);
  tokenManager.setUser(payload.user);
  seedAuthStore({
    user: {
      id: payload.user.id,
      email: payload.user.primaryEmail || "",
      firstName: payload.user.displayName || payload.user.primaryEmail || "",
      lastName: "",
      role: (payload.user.roles?.[0] ?? "PATIENT") as never,
    },
    tenant: null,
  });
}

function clearLocalAuthSession() {
  if (!isBrowserRuntime()) return;
  tokenManager.clearAll();
  clearAuthStore();
}

export async function patientGoogleAuth(data: PatientGoogleAuthRequest) {
  const response = await httpClient.post<ApiPayload<AuthSuccessResponse>>(
    "/auth/patient/google",
    data
  );
  const normalized = extractData(response.data);
  storeAuthSession(normalized);
  return normalized;
}

export async function patientRegister(data: PatientRegisterRequest) {
  const response = await httpClient.post<ApiPayload<AuthSuccessResponse>>(
    "/auth/patient/register",
    data
  );
  const normalized = extractData(response.data);
  storeAuthSession(normalized);
  return normalized;
}

export async function patientLogin(data: PatientLoginRequest) {
  const response = await httpClient.post<ApiPayload<AuthSuccessResponse>>(
    "/auth/patient/login",
    data
  );
  const normalized = extractData(response.data);
  storeAuthSession(normalized);
  return normalized;
}

export async function patientRefresh(data: RefreshTokenRequest = {}) {
  const response = await httpClient.post<ApiPayload<AuthSuccessResponse>>(
    "/auth/patient/refresh",
    data,
    {
      headers: buildRefreshAuthHeader(data.refreshToken),
    }
  );
  const normalized = extractData(response.data);
  storeAuthSession(normalized);
  return normalized;
}

export async function patientLogout() {
  try {
    const response = await httpClient.post<ApiPayload<MessageResponse>>(
      "/auth/patient/logout",
      undefined,
      {
        headers: buildRefreshAuthHeader(),
      }
    );
    return extractData(response.data);
  } finally {
    // Always clear local state to avoid stale authenticated UI after logout failures.
    clearLocalAuthSession();
  }
}

export async function practitionerRegister(data: PractitionerRegisterRequest) {
  const response = await httpClient.post<ApiPayload<PractitionerRegistrationResponse>>(
    "/auth/practitioner/register",
    data
  );
  return extractData(response.data);
}

export async function practitionerLogin(data: PractitionerLoginRequest) {
  const response = await httpClient.post<ApiPayload<OtpChallengeResponse>>(
    "/auth/practitioner/login",
    data
  );
  return extractData(response.data);
}

export async function practitionerVerifyOtp(data: PractitionerVerifyOtpRequest) {
  const response = await httpClient.post<ApiPayload<AuthSuccessResponse>>(
    "/auth/practitioner/login/verify-otp",
    data
  );
  const normalized = extractData(response.data);
  storeAuthSession(normalized);
  return normalized;
}

export async function practitionerRefresh(data: RefreshTokenRequest = {}) {
  const response = await httpClient.post<ApiPayload<AuthSuccessResponse>>(
    "/auth/practitioner/refresh",
    data,
    {
      headers: buildRefreshAuthHeader(data.refreshToken),
    }
  );
  const normalized = extractData(response.data);
  storeAuthSession(normalized);
  return normalized;
}

export async function practitionerLogout() {
  try {
    const response = await httpClient.post<ApiPayload<MessageResponse>>(
      "/auth/practitioner/logout",
      undefined,
      {
        headers: buildRefreshAuthHeader(),
      }
    );
    return extractData(response.data);
  } finally {
    clearLocalAuthSession();
  }
}

export async function practitionerForgotPassword(
  data: PractitionerForgotPasswordRequest
) {
  const response = await httpClient.post<ApiPayload<MessageResponse>>(
    "/auth/practitioner/forgot-password",
    data
  );
  return extractData(response.data);
}

export async function practitionerResetPassword(
  data: PractitionerResetPasswordRequest
) {
  const response = await httpClient.post<ApiPayload<MessageResponse>>(
    "/auth/practitioner/reset-password",
    data
  );
  return extractData(response.data);
}

export async function adminLogin(data: AdminLoginRequest) {
  const response = await httpClient.post<ApiPayload<AuthSuccessResponse>>(
    "/auth/admin/login",
    data
  );
  const normalized = extractData(response.data);
  storeAuthSession(normalized);
  return normalized;
}

export async function adminRefresh(data: RefreshTokenRequest = {}) {
  const response = await httpClient.post<ApiPayload<AuthSuccessResponse>>(
    "/auth/admin/refresh",
    data,
    {
      headers: buildRefreshAuthHeader(data.refreshToken),
    }
  );
  const normalized = extractData(response.data);
  storeAuthSession(normalized);
  return normalized;
}

export async function adminLogout() {
  try {
    const response = await httpClient.post<ApiPayload<MessageResponse>>(
      "/auth/admin/logout",
      undefined,
      {
        headers: buildRefreshAuthHeader(),
      }
    );
    return extractData(response.data);
  } finally {
    clearLocalAuthSession();
  }
}

export async function getAuthMe() {
  const response = await httpClient.get<ApiPayload<CurrentAuthUserResponse>>("/auth/me");
  return extractData(response.data);
}
