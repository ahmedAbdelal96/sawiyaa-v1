import { useAuth } from "../../providers/AuthProvider";
import type { MobileRole } from "./contracts";

export function useAuthenticatedQueryEnabled(requiredRole?: MobileRole) {
  const { isLoading, role, user } = useAuth();

  if (isLoading || !user) {
    return false;
  }

  if (requiredRole && role !== requiredRole) {
    return false;
  }

  return true;
}
