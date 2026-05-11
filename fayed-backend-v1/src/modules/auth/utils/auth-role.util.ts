import { AppRole } from '@common/enums/app-role.enum';
import { UserRoleType } from '@prisma/client';

/**
 * Prisma role enums are mapped into the common authorization layer so guards can stay framework-wide.
 */
export function mapUserRoleTypeToAppRole(role: UserRoleType): AppRole {
  switch (role) {
    case UserRoleType.PATIENT:
      return AppRole.PATIENT;
    case UserRoleType.PRACTITIONER:
      return AppRole.PRACTITIONER;
    case UserRoleType.SUPER_ADMIN:
      return AppRole.SUPER_ADMIN;
    case UserRoleType.ADMIN:
      return AppRole.ADMIN;
    case UserRoleType.FINANCE_STAFF:
      return AppRole.FINANCE_STAFF;
    case UserRoleType.MARKETING_STAFF:
      return AppRole.MARKETING_STAFF;
    case UserRoleType.PRACTITIONER_REVIEWER:
      return AppRole.PRACTITIONER_REVIEWER;
    case UserRoleType.PATIENT_OPERATIONS:
      return AppRole.PATIENT_OPERATIONS;
    case UserRoleType.SUPPORT:
      return AppRole.SUPPORT_AGENT;
    case UserRoleType.CONTENT_REVIEWER:
      return AppRole.CONTENT_REVIEWER;
    default:
      return AppRole.PATIENT;
  }
}

export function normalizeAppRoles(roles: AppRole[]): AppRole[] {
  const normalized = new Set(roles);

  // SUPER_ADMIN should retain ADMIN-equivalent access for legacy admin checks.
  if (normalized.has(AppRole.SUPER_ADMIN)) {
    normalized.add(AppRole.ADMIN);
  }

  return [...normalized];
}
