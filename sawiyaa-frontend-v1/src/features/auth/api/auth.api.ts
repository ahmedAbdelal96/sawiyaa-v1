import httpClient, { tokenManager } from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import { clearAuthStore, seedAuthStore } from "@/stores/auth-store";
import type {
  AdminLoginRequest,
  AdminStepUpVerifyRequest,
  AdminStepUpVerifyResponse,
  AuthSuccessResponse,
  CurrentAuthUserResponse,
  MessageResponse,
  OtpChallengeResponse,
  PatientForgotPasswordRequest,
  PatientVerifyPasswordResetOtpRequest,
  PatientVerifyPasswordResetOtpResponse,
  PatientConfirmPasswordResetRequest,
  PatientGoogleAuthRequest,
  PatientLoginRequest,
  PatientRegisterRequest,
  PatientResetPasswordRequest,
  PractitionerForgotPasswordRequest,
  PractitionerVerifyPasswordResetOtpRequest,
  PractitionerVerifyPasswordResetOtpResponse,
  PractitionerConfirmPasswordResetRequest,
  PractitionerLoginRequest,
  PractitionerRegisterRequest,
  PractitionerRegistrationResponse,
  PractitionerResetPasswordRequest,
  PractitionerLoginResponse,
  PractitionerAuthenticatedResponse,
  PractitionerOtpChallengeResponse,
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

function isPractitionerOtpChallengeResponse(
  value: unknown,
): value is PractitionerOtpChallengeResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const response = value as Record<string, unknown>;
  return (
    response.nextStep === "OTP_REQUIRED" &&
    typeof response.challengeId === "string" &&
    typeof response.maskedTarget === "string" &&
    typeof response.expiresAt === "string" &&
    typeof response.channel === "string" &&
    response.requiresOtpVerification === true
  );
}

function isPractitionerAuthenticatedResponse(
  value: unknown,
): value is PractitionerAuthenticatedResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const response = value as Record<string, unknown>;
  const tokens = response.tokens as Record<string, unknown> | undefined;
  const user = response.user as Record<string, unknown> | undefined;

  return (
    (response.nextStep === "AUTHENTICATED" || response.nextStep === undefined) &&
    !!tokens &&
    typeof tokens.accessToken === "string" &&
    !!user &&
    typeof user.id === "string"
  );
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
  const response = await httpClient.post<ApiPayload<PractitionerLoginResponse>>(
    "/auth/practitioner/login",
    data
  );
  const normalized = extractData(response.data) as unknown;

  if (isPractitionerAuthenticatedResponse(normalized)) {
    storeAuthSession(normalized);
    return normalized;
  }

  if (isPractitionerOtpChallengeResponse(normalized)) {
    return normalized;
  }

  throw new Error("PRACTITIONER_LOGIN_INVALID_RESPONSE");
}

export async function practitionerVerifyOtp(data: PractitionerVerifyOtpRequest) {
  const response = await httpClient.post<ApiPayload<AuthSuccessResponse>>(
    "/auth/practitioner/login/verify-otp",
    data
  );
  const normalized = extractData(response.data) as unknown;

  if (!isPractitionerAuthenticatedResponse(normalized)) {
    throw new Error("PRACTITIONER_LOGIN_INVALID_RESPONSE");
  }

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

export async function practitionerVerifyPasswordResetOtp(
  data: PractitionerVerifyPasswordResetOtpRequest
) {
  const response = await httpClient.post<ApiPayload<PractitionerVerifyPasswordResetOtpResponse>>(
    "/auth/practitioner/verify-password-reset-otp",
    data
  );
  return extractData(response.data);
}

export async function practitionerConfirmPasswordReset(
  data: PractitionerConfirmPasswordResetRequest
) {
  const response = await httpClient.post<ApiPayload<MessageResponse>>(
    "/auth/practitioner/confirm-password-reset",
    data
  );
  return extractData(response.data);
}

export async function patientForgotPassword(
  data: PatientForgotPasswordRequest
) {
  const response = await httpClient.post<ApiPayload<MessageResponse>>(
    "/auth/patient/forgot-password",
    data
  );
  return extractData(response.data);
}

export async function patientResetPassword(
  data: PatientResetPasswordRequest
) {
  const response = await httpClient.post<ApiPayload<MessageResponse>>(
    "/auth/patient/reset-password",
    data
  );
  return extractData(response.data);
}

export async function patientVerifyPasswordResetOtp(
  data: PatientVerifyPasswordResetOtpRequest
) {
  const response = await httpClient.post<ApiPayload<PatientVerifyPasswordResetOtpResponse>>(
    "/auth/patient/verify-password-reset-otp",
    data
  );
  return extractData(response.data);
}

export async function patientConfirmPasswordReset(
  data: PatientConfirmPasswordResetRequest
) {
  const response = await httpClient.post<ApiPayload<MessageResponse>>(
    "/auth/patient/confirm-password-reset",
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

export async function verifyAdminStepUp(data: AdminStepUpVerifyRequest) {
  const response = await httpClient.post<ApiPayload<AdminStepUpVerifyResponse>>(
    "/auth/admin/step-up/verify",
    data
  );
  return extractData(response.data);
}

export async function getAuthMe() {
  const response = await httpClient.get<ApiPayload<CurrentAuthUserResponse>>("/auth/me");
  return extractData(response.data);
}
