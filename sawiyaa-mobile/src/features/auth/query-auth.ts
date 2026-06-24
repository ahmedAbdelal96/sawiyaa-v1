import { useAuth } from "../../providers/AuthProvider";
import type { MobileSupportedRole } from "./contracts";

export function useAuthenticatedQueryEnabled(requiredRole?: MobileSupportedRole) {
  const { isLoading, role, user } = useAuth();

  if (isLoading || !user) {
    return false;
  }

  if (requiredRole && role !== requiredRole) {
    return false;
  }

  return true;
}
