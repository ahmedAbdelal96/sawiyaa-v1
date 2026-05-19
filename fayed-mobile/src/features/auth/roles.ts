import type { AuthenticatedUser, MobileSupportedRole } from "./contracts";

/**
 * Resolves the mobile runtime role for an authenticated user.
 *
 * Returns null for any user that is not PATIENT or PRACTITIONER —
 * including all admin-class roles. Callers must treat null as an
 * unsupported role and clear the session / show unsupported-role state.
 *
 * Do NOT add an "admin" or default fallback here.
 */
export function resolveMobileRole(
  user: AuthenticatedUser,
): MobileSupportedRole | null {
  const roles: string[] = user.roles;

  if (roles.includes("PATIENT")) {
    return "patient";
  }

  if (roles.includes("PRACTITIONER")) {
    return "practitioner";
  }

  return null;
}
