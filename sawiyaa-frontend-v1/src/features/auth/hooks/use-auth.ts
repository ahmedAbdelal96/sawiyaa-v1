import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminLogin,
  adminLogout,
  adminRefresh,
  getAuthMe,
  patientForgotPassword,
  patientVerifyPasswordResetOtp,
  patientConfirmPasswordReset,
  patientGoogleAuth,
  patientLogin,
  patientLogout,
  patientRefresh,
  patientRegister,
  patientResetPassword,
  practitionerForgotPassword,
  practitionerVerifyPasswordResetOtp,
  practitionerConfirmPasswordReset,
  practitionerLogin,
  practitionerLogout,
  practitionerRefresh,
  practitionerRegister,
  practitionerResetPassword,
  practitionerVerifyOtp,
} from "../api/auth.api";
import { authQueryKeys } from "../constants/query-keys";
import { presenceQueryKeys } from "@/features/presence/constants/query-keys";
import type { RefreshTokenRequest } from "../types/auth.types";
import type { PractitionerLoginResponse } from "../types/auth.types";

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
    onPractitionerPresenceSuccess: () => {
      queryClient.invalidateQueries({ queryKey: presenceQueryKeys.me() });
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
    retry: false,
  });
}

export function usePatientRegister() {
  const { onAuthSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: patientRegister,
    onSuccess: onAuthSuccess,
    retry: false,
  });
}

export function usePatientLogin() {
  const { onAuthSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: patientLogin,
    onSuccess: onAuthSuccess,
    retry: false,
  });
}

export function usePatientRefresh() {
  const { onAuthSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: (data?: RefreshTokenRequest) => patientRefresh(data),
    onSuccess: onAuthSuccess,
    retry: false,
  });
}

export function usePatientLogout() {
  const { onLogoutSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: patientLogout,
    onSuccess: onLogoutSuccess,
    retry: false,
  });
}

export function usePatientForgotPassword() {
  return useMutation({
    mutationFn: patientForgotPassword,
    retry: false,
  });
}

export function usePatientResetPassword() {
  return useMutation({
    mutationFn: patientResetPassword,
    retry: false,
  });
}

export function usePatientVerifyPasswordResetOtp() {
  return useMutation({
    mutationFn: patientVerifyPasswordResetOtp,
    retry: false,
  });
}

export function usePatientConfirmPasswordReset() {
  return useMutation({
    mutationFn: patientConfirmPasswordReset,
    retry: false,
  });
}

export function usePractitionerRegister() {
  return useMutation({
    mutationFn: practitionerRegister,
    retry: false,
  });
}

export function usePractitionerLogin() {
  const { onAuthSuccess, onPractitionerPresenceSuccess } =
    useAuthMutationInvalidation();
  return useMutation({
    mutationFn: practitionerLogin,
    retry: false,
    onSuccess: (data: PractitionerLoginResponse) => {
      onPractitionerPresenceSuccess();

      if (data.nextStep === "AUTHENTICATED") {
        onAuthSuccess();
      }
    },
  });
}

export function usePractitionerVerifyOtp() {
  const { onAuthSuccess, onPractitionerPresenceSuccess } =
    useAuthMutationInvalidation();
  return useMutation({
    mutationFn: practitionerVerifyOtp,
    retry: false,
    onSuccess: () => {
      onPractitionerPresenceSuccess();
      onAuthSuccess();
    },
  });
}

export function usePractitionerRefresh() {
  const { onAuthSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: (data?: RefreshTokenRequest) => practitionerRefresh(data),
    onSuccess: onAuthSuccess,
    retry: false,
  });
}

export function usePractitionerLogout() {
  const { onLogoutSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: practitionerLogout,
    onSuccess: onLogoutSuccess,
    retry: false,
  });
}

export function usePractitionerForgotPassword() {
  return useMutation({
    mutationFn: practitionerForgotPassword,
    retry: false,
  });
}

export function usePractitionerResetPassword() {
  return useMutation({
    mutationFn: practitionerResetPassword,
    retry: false,
  });
}

export function usePractitionerVerifyPasswordResetOtp() {
  return useMutation({
    mutationFn: practitionerVerifyPasswordResetOtp,
    retry: false,
  });
}

export function usePractitionerConfirmPasswordReset() {
  return useMutation({
    mutationFn: practitionerConfirmPasswordReset,
    retry: false,
  });
}

export function useAdminLogin() {
  const { onAuthSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: adminLogin,
    onSuccess: onAuthSuccess,
    retry: false,
  });
}

export function useAdminRefresh() {
  const { onAuthSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: (data?: RefreshTokenRequest) => adminRefresh(data),
    onSuccess: onAuthSuccess,
    retry: false,
  });
}

export function useAdminLogout() {
  const { onLogoutSuccess } = useAuthMutationInvalidation();
  return useMutation({
    mutationFn: adminLogout,
    onSuccess: onLogoutSuccess,
    retry: false,
  });
}
