import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRoleType, UserStatus } from '@prisma/client';
import { AppRole } from '@common/enums/app-role.enum';

const INTERNAL_ROLE_TYPES: ReadonlySet<UserRoleType> = new Set<UserRoleType>([
  UserRoleType.SUPER_ADMIN,
  UserRoleType.ADMIN,
  UserRoleType.SUPPORT,
  UserRoleType.FINANCE_STAFF,
  UserRoleType.CONTENT_REVIEWER,
  UserRoleType.PRACTITIONER_REVIEWER,
  UserRoleType.PATIENT_OPERATIONS,
  UserRoleType.MARKETING_STAFF,
]);

@Injectable()
export class AdminUserManagementPolicy {
  isInternalRole(role: UserRoleType): boolean {
    return INTERNAL_ROLE_TYPES.has(role);
  }

  assertInternalRoles(roles: UserRoleType[]): void {
    if (!Array.isArray(roles) || roles.length === 0) {
      throw new BadRequestException({
        message: 'Roles are required',
        error: 'ADMIN_USERS_ROLES_REQUIRED',
      });
    }

    const invalid = roles.filter((role) => !this.isInternalRole(role));
    if (invalid.length > 0) {
      throw new BadRequestException({
        message: 'One or more roles are not internal admin roles',
        error: 'ADMIN_USERS_INVALID_INTERNAL_ROLE',
        details: { roles: invalid },
      });
    }
  }

  /**
   * Prevent self-lockout from admin user-management flows.
   * (Dedicated self-logout flows should remain separate.)
   */
  assertNotSelf(actorUserId: string, targetUserId: string): void {
    if (actorUserId === targetUserId) {
      throw new ForbiddenException({
        message: 'Self-management is not allowed for this route',
        error: 'ADMIN_USERS_SELF_ACTION_BLOCKED',
      });
    }
  }

  assertActorCanAssignRoles(input: {
    actorRoles: AppRole[];
    desiredRoles: UserRoleType[];
  }): void {
    // Only SUPER_ADMIN can assign SUPER_ADMIN.
    if (
      input.desiredRoles.includes(UserRoleType.SUPER_ADMIN) &&
      !input.actorRoles.includes(AppRole.SUPER_ADMIN)
    ) {
      throw new ForbiddenException({
        message: 'Only SUPER_ADMIN can assign SUPER_ADMIN',
        error: 'ADMIN_USERS_CANNOT_ASSIGN_SUPER_ADMIN',
      });
    }
  }

  isDisablingStatus(status: UserStatus): boolean {
    return status !== UserStatus.ACTIVE;
  }
}
