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
    case UserRoleType.ADMIN:
    case UserRoleType.SUPER_ADMIN:
      return AppRole.ADMIN;
    case UserRoleType.SUPPORT:
      return AppRole.SUPPORT_AGENT;
    case UserRoleType.CONTENT_REVIEWER:
      return AppRole.CONTENT_REVIEWER;
    default:
      return AppRole.PATIENT;
  }
}
