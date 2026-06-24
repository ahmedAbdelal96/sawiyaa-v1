import { apiClient, extractApiData } from "../../lib/api";
import type {
  AuthSuccessResponse,
  CurrentAuthUserResponse,
  MessageResponse,
  OtpChallengeResponse,
  PractitionerLoginResponse,
  PatientGoogleAuthRequest,
  PatientLoginRequest,
  PatientRegisterRequest,
  PatientForgotPasswordRequest,
  PatientVerifyPasswordResetOtpRequest,
  PatientVerifyPasswordResetOtpResponse,
  PatientConfirmPasswordResetRequest,
  PatientResetPasswordRequest,
  PractitionerForgotPasswordRequest,
  PractitionerVerifyPasswordResetOtpRequest,
  PractitionerVerifyPasswordResetOtpResponse,
  PractitionerConfirmPasswordResetRequest,
  PractitionerLoginRequest,
  PractitionerRegisterRequest,
  PractitionerRegistrationResponse,
  PractitionerResetPasswordRequest,
  PractitionerVerifyOtpRequest,
  RefreshTokenRequest,
} from "./contracts";

function buildRefreshAuthHeader(refreshToken?: string) {
  return refreshToken ? { Authorization: `Bearer ${refreshToken}` } : undefined;
}

export async function patientGoogleAuth(data: PatientGoogleAuthRequest) {
  const response = await apiClient.post("/auth/patient/google", data);
  return extractApiData<AuthSuccessResponse>(response);
}

export async function patientRegister(data: PatientRegisterRequest) {
  const response = await apiClient.post("/auth/patient/register", data);
  return extractApiData<AuthSuccessResponse>(response);
}

export async function patientLogin(data: PatientLoginRequest) {
  const response = await apiClient.post("/auth/patient/login", data);
  return extractApiData<AuthSuccessResponse>(response);
}

export async function patientRefresh(data: RefreshTokenRequest = {}) {
  const response = await apiClient.post("/auth/patient/refresh", data, {
    headers: buildRefreshAuthHeader(data.refreshToken),
  });
  return extractApiData<AuthSuccessResponse>(response);
}

export async function patientLogout(refreshToken?: string) {
  const response = await apiClient.post("/auth/patient/logout", undefined, {
    headers: buildRefreshAuthHeader(refreshToken),
  });
  return extractApiData<MessageResponse>(response);
}

export async function patientForgotPassword(
  data: PatientForgotPasswordRequest,
) {
  const response = await apiClient.post("/auth/patient/forgot-password", data);
  return extractApiData<MessageResponse>(response);
}

export async function patientResetPassword(data: PatientResetPasswordRequest) {
  const response = await apiClient.post("/auth/patient/reset-password", data);
  return extractApiData<MessageResponse>(response);
}

export async function patientVerifyPasswordResetOtp(
  data: PatientVerifyPasswordResetOtpRequest,
) {
  const response = await apiClient.post(
    "/auth/patient/verify-password-reset-otp",
    data,
  );
  return extractApiData<PatientVerifyPasswordResetOtpResponse>(response);
}

export async function patientConfirmPasswordReset(
  data: PatientConfirmPasswordResetRequest,
) {
  const response = await apiClient.post(
    "/auth/patient/confirm-password-reset",
    data,
  );
  return extractApiData<MessageResponse>(response);
}

export async function practitionerRegister(data: PractitionerRegisterRequest) {
  const response = await apiClient.post("/auth/practitioner/register", data);
  return extractApiData<PractitionerRegistrationResponse>(response);
}

export async function practitionerLogin(data: PractitionerLoginRequest) {
  const response = await apiClient.post("/auth/practitioner/login", data);
  return extractApiData<PractitionerLoginResponse>(response);
}

export async function practitionerVerifyOtp(
  data: PractitionerVerifyOtpRequest,
) {
  const response = await apiClient.post(
    "/auth/practitioner/login/verify-otp",
    data,
  );
  return extractApiData<AuthSuccessResponse>(response);
}

export async function practitionerRefresh(data: RefreshTokenRequest = {}) {
  const response = await apiClient.post("/auth/practitioner/refresh", data, {
    headers: buildRefreshAuthHeader(data.refreshToken),
  });
  return extractApiData<AuthSuccessResponse>(response);
}

export async function practitionerLogout(refreshToken?: string) {
  const response = await apiClient.post(
    "/auth/practitioner/logout",
    undefined,
    {
      headers: buildRefreshAuthHeader(refreshToken),
    },
  );
  return extractApiData<MessageResponse>(response);
}

export async function practitionerForgotPassword(
  data: PractitionerForgotPasswordRequest,
) {
  const response = await apiClient.post(
    "/auth/practitioner/forgot-password",
    data,
  );
  return extractApiData<MessageResponse>(response);
}

export async function practitionerResetPassword(
  data: PractitionerResetPasswordRequest,
) {
  const response = await apiClient.post(
    "/auth/practitioner/reset-password",
    data,
  );
  return extractApiData<MessageResponse>(response);
}

export async function practitionerVerifyPasswordResetOtp(
  data: PractitionerVerifyPasswordResetOtpRequest,
) {
  const response = await apiClient.post(
    "/auth/practitioner/verify-password-reset-otp",
    data,
  );
  return extractApiData<PractitionerVerifyPasswordResetOtpResponse>(response);
}

export async function practitionerConfirmPasswordReset(
  data: PractitionerConfirmPasswordResetRequest,
) {
  const response = await apiClient.post(
    "/auth/practitioner/confirm-password-reset",
    data,
  );
  return extractApiData<MessageResponse>(response);
}

export async function getAuthMe() {
  const response = await apiClient.get("/auth/me");
  return extractApiData<CurrentAuthUserResponse>(response);
}
