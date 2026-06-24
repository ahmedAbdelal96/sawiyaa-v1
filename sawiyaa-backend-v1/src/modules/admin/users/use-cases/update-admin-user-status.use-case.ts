import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRoleType, UserStatus } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';
import { AdminUserManagementPolicy } from '../policies/admin-user-management.policy';
import { AdminUsersRepository } from '../repositories/admin-users.repository';

@Injectable()
export class UpdateAdminUserStatusUseCase {
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
    status: UserStatus;
  }) {
    this.policy.assertNotSelf(input.actor.id, input.userId);

    const existing = await this.repo.findInternalUserById(input.userId);
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'admin.adminUsers.errors.userNotFound',
        error: 'ADMIN_USER_NOT_FOUND',
      });
    }

    const hasSuperAdmin = existing.roles.some(
      (r) => r.role === UserRoleType.SUPER_ADMIN,
    );

    if (hasSuperAdmin && this.policy.isDisablingStatus(input.status)) {
      const count = await this.repo.countSuperAdmins();
      if (count <= 1) {
        throw new ForbiddenException({
          messageKey: 'admin.adminUsers.errors.lastSuperAdminProtected',
          error: 'ADMIN_USERS_LAST_SUPER_ADMIN_PROTECTED',
        });
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await this.repo.updateUserStatus(
        input.userId,
        input.status,
        tx,
      );

      let revokedCount = 0;
      let newTokenVersion: number | null = null;
      if (this.policy.isDisablingStatus(input.status)) {
        revokedCount = await this.repo.revokeAllActiveSessions(
          input.userId,
          tx,
        );
        const bumped = await this.repo.bumpTokenVersion(input.userId, tx);
        newTokenVersion = bumped.tokenVersion;
      }

      return { updated, revokedCount, newTokenVersion };
    });

    this.securityAuditService.logAsync({
      action: 'security.adminUsers.status.update.success',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: input.actor.id,
      actorRoles: input.actor.roles,
      resourceType: 'User',
      resourceId: input.userId,
      targetUserId: input.userId,
      metadata: {
        oldStatus: existing.status,
        newStatus: result.updated.status,
        revokedSessionsCount: result.revokedCount,
        tokenVersion: result.newTokenVersion,
      },
    });

    return {
      message: this.i18nService.t(
        'admin.adminUsers.success.statusUpdated',
        input.locale,
      ),
      status: result.updated.status,
    };
  }
}
