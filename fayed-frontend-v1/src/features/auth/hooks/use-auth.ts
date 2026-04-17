import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminLogin,
  adminLogout,
  adminRefresh,
  getAuthMe,
  patientGoogleAuth,
  patientLogin,
  patientLogout,
  patientRefresh,
  patientRegister,
  practitionerForgotPassword,
  practitionerLogin,
  practitionerLogout,
  practitionerRefresh,
  practitionerRegister,
  practitionerResetPassword,
  practitionerVerifyOtp,
} from "../api/auth.api";
import { authQueryKeys } from "../constants/query-keys";
import type { RefreshTokenRequest } from "../types/auth.types";

/**
 * Query for the currently authenticated request context from /auth/me.
 * Useful for route protection and session-level flags.
 */
export function useAuthMe(enabled = true) {
  return useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: getAuthMe,
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
}

/**
 * Auth mutation helpers share one cache invalidation strategy.
 * After successful auth events we invalidate auth/users to refresh role/security UI.
 */
function useAuthMutationInvalidation() {
  const queryClient = useQueryClient();

  return {
    onAuthSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onLogoutSuccess: () => {
      queryClient.clear();
    },
  };
}

export function usePatientGoogleAuth() {
  const { onAuthSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: patientGoogleAuth,
    onSuccess: onAuthSuccess,
  });
}

export function usePatientRegister() {
  const { onAuthSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: patientRegister,
    onSuccess: onAuthSuccess,
  });
}

export function usePatientLogin() {
  const { onAuthSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: patientLogin,
    onSuccess: onAuthSuccess,
  });
}

export function usePatientRefresh() {
  const { onAuthSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: (data?: RefreshTokenRequest) => patientRefresh(data),
    onSuccess: onAuthSuccess,
  });
}

export function usePatientLogout() {
  const { onLogoutSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: patientLogout,
    onSuccess: onLogoutSuccess,
  });
}

export function usePractitionerRegister() {
  return useMutation({
    mutationFn: practitionerRegister,
  });
}

export function usePractitionerLogin() {
  return useMutation({
    mutationFn: practitionerLogin,
  });
}

export function usePractitionerVerifyOtp() {
  const { onAuthSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: practitionerVerifyOtp,
    onSuccess: onAuthSuccess,
  });
}

export function usePractitionerRefresh() {
  const { onAuthSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: (data?: RefreshTokenRequest) => practitionerRefresh(data),
    onSuccess: onAuthSuccess,
  });
}

export function usePractitionerLogout() {
  const { onLogoutSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: practitionerLogout,
    onSuccess: onLogoutSuccess,
  });
}

export function usePractitionerForgotPassword() {
  return useMutation({
    mutationFn: practitionerForgotPassword,
  });
}

export function usePractitionerResetPassword() {
  return useMutation({
    mutationFn: practitionerResetPassword,
  });
}

export function useAdminLogin() {
  const { onAuthSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: adminLogin,
    onSuccess: onAuthSuccess,
  });
}

export function useAdminRefresh() {
  const { onAuthSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: (data?: RefreshTokenRequest) => adminRefresh(data),
    onSuccess: onAuthSuccess,
  });
}

export function useAdminLogout() {
  const { onLogoutSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: adminLogout,
    onSuccess: onLogoutSuccess,
  });
}

