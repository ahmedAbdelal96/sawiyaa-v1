export type SessionRole =
  | "PATIENT"
  | "PRACTITIONER"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "SUPPORT_AGENT"
  | "CONTENT_REVIEWER"
  | string;

export function isAdminRole(role?: SessionRole | null): boolean {
  if (!role) return false;

  return (
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "SUPPORT_AGENT" ||
    role === "CONTENT_REVIEWER"
  );
}

