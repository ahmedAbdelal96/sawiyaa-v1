import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';
import { AdminUserManagementPolicy } from '../policies/admin-user-management.policy';
import { AdminUsersRepository } from '../repositories/admin-users.repository';

@Injectable()
export class UpdateAdminUserRolesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly repo: AdminUsersRepository,
    private readonly policy: AdminUserManagementPolicy,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    actor: AuthenticatedUser;
    userId: string;
    roles: UserRoleType[];
  }) {
    this.policy.assertNotSelf(input.actor.id, input.userId);

    const desiredRoles = [...new Set(input.roles)];
    this.policy.assertInternalRoles(desiredRoles);
    this.policy.assertActorCanAssignRoles({
      actorRoles: input.actor.roles,
      desiredRoles,
    });

    const existing = await this.repo.findInternalUserById(input.userId);
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'admin.adminUsers.errors.userNotFound',
        error: 'ADMIN_USER_NOT_FOUND',
      });
    }

    const existingInternalRoles = existing.roles.map((r) => r.role);
    const existingHasSuperAdmin = existingInternalRoles.includes(
      UserRoleType.SUPER_ADMIN,
    );
    const desiredHasSuperAdmin = desiredRoles.includes(
      UserRoleType.SUPER_ADMIN,
    );

    if (existingHasSuperAdmin && !desiredHasSuperAdmin) {
      const count = await this.repo.countSuperAdmins();
      if (count <= 1) {
        throw new ForbiddenException({
          messageKey: 'admin.adminUsers.errors.lastSuperAdminProtected',
          error: 'ADMIN_USERS_LAST_SUPER_ADMIN_PROTECTED',
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await this.repo.setUserRoles(
        { userId: input.userId, roles: desiredRoles },
        tx,
      );
    });

    this.securityAuditService.logAsync({
      action: 'security.adminUsers.roles.update.success',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: input.actor.id,
      actorRoles: input.actor.roles,
      resourceType: 'User',
      resourceId: input.userId,
      targetUserId: input.userId,
      metadata: {
        oldRoles: existingInternalRoles,
        newRoles: desiredRoles,
      },
    });

    return {
      message: this.i18nService.t(
        'admin.adminUsers.success.rolesUpdated',
        input.locale,
      ),
      roles: desiredRoles,
    };
  }
}
