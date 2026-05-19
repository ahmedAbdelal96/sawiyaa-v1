export type SessionRole =
  | "PATIENT"
  | "PRACTITIONER"
  | "ADMIN"
  | "FINANCE_STAFF"
  | "MARKETING_STAFF"
  | "PRACTITIONER_REVIEWER"
  | "PATIENT_OPERATIONS"
  | "SUPER_ADMIN"
  | "SUPPORT_AGENT"
  | "CONTENT_REVIEWER"
  | string;

export function isAdminRole(role?: SessionRole | null): boolean {
  if (!role) return false;

  return (
    role === "ADMIN" ||
    role === "FINANCE_STAFF" ||
    role === "MARKETING_STAFF" ||
    role === "PRACTITIONER_REVIEWER" ||
    role === "PATIENT_OPERATIONS" ||
    role === "SUPER_ADMIN" ||
    role === "SUPPORT_AGENT" ||
    role === "CONTENT_REVIEWER"
  );
}
