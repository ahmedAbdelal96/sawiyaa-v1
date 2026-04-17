import { useMutation } from "@tanstack/react-query";

import type { LoginPayload, RegisterPayload } from "@/auth/api/auth.contracts";
import { authSessionService } from "@/auth/application/auth-session.service";

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginPayload) => authSessionService.login(payload),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authSessionService.register(payload),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => authSessionService.logout(),
  });
}

