import { useAuthSessionStore } from "@/auth/store/auth-session.store";

export function useAuthSession() {
  const status = useAuthSessionStore((state) => state.status);
  const user = useAuthSessionStore((state) => state.user);
  const profile = useAuthSessionStore((state) => state.profile);

  return {
    status,
    user,
    profile,
    isAuthenticated: status === "authenticated",
  };
}

