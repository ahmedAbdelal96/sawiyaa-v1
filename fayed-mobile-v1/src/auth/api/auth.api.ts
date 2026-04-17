import axios from "axios";

import type {
  AuthSuccessEnvelope,
  CurrentUserSummaryEnvelope,
  LoginPayload,
  LogoutEnvelope,
  RegisterPayload,
} from "@/auth/api/auth.contracts";
import { env } from "@/core/env";
import { unwrapApiData } from "@/networking/contracts/api-envelope";
import { httpClient } from "@/networking/http/client";

const authClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export async function loginPatient(payload: LoginPayload) {
  const response = await httpClient.post<AuthSuccessEnvelope>("/auth/patient/login", payload);
  return unwrapApiData(response.data);
}

export async function registerPatient(payload: RegisterPayload) {
  const response = await httpClient.post<AuthSuccessEnvelope>("/auth/patient/register", payload);
  return unwrapApiData(response.data);
}

export async function refreshPatientSession(refreshToken: string) {
  const response = await authClient.post<AuthSuccessEnvelope>(
    "/auth/patient/refresh",
    { refreshToken },
    {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    },
  );

  return unwrapApiData(response.data);
}

export async function logoutPatient(refreshToken: string) {
  const response = await authClient.post<LogoutEnvelope>(
    "/auth/patient/logout",
    { refreshToken },
    {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    },
  );

  return unwrapApiData(response.data);
}

export async function getCurrentAuthContext() {
  // Kept for auth/session diagnostics; product bootstrap relies on /users/me.
  return httpClient.get("/auth/me");
}

export async function getCurrentUserSummaryRequest() {
  const response = await httpClient.get<CurrentUserSummaryEnvelope>("/users/me");
  return unwrapApiData(response.data);
}
