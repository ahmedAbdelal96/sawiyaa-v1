import type { AuthenticatedUser, MobileRole } from "./contracts";

export function resolveMobileRole(user: AuthenticatedUser): MobileRole {
  if (user.roles.includes("PATIENT")) {
    return "patient";
  }

  if (user.roles.includes("PRACTITIONER")) {
    return "practitioner";
  }

  return "admin";
}
