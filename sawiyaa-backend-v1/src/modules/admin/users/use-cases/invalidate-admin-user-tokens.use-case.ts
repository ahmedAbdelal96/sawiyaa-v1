import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { AdminUserManagementPolicy } from '../policies/admin-user-management.policy';
import { AdminUsersRepository } from '../repositories/admin-users.repository';

@Injectable()
export class InvalidateAdminUserTokensUseCase {
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
  }) {
    this.policy.assertNotSelf(input.actor.id, input.userId);

    const isInternal = await this.repo.isInternalUser(input.userId);
    if (!isInternal) {
      throw new NotFoundException({
        messageKey: 'admin.adminUsers.errors.userNotFound',
        error: 'ADMIN_USER_NOT_FOUND',
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const revokedSessionsCount = await this.repo.revokeAllActiveSessions(
        input.userId,
        tx,
      );
      const bumped = await this.repo.bumpTokenVersion(input.userId, tx);
      await this.securityAuditService.recordRequired(tx, {
        action: 'security.adminUsers.tokenVersion.invalidate.success',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorType: SecurityAuditActorType.USER,
        source: SecurityAuditSource.HTTP_REQUEST,
        actorUserId: input.actor.id,
        actorRoles: input.actor.roles,
        resourceType: 'User',
        resourceId: input.userId,
        targetUserId: input.userId,
        metadata: {
          revokedSessionsCount,
          tokenVersion: bumped.tokenVersion,
        },
      });
      return { revokedSessionsCount, tokenVersion: bumped.tokenVersion };
    });

    return {
      message: this.i18nService.t(
        'admin.adminUsers.success.tokensInvalidated',
        input.locale,
      ),
      revokedSessionsCount: result.revokedSessionsCount,
      tokenVersion: result.tokenVersion,
    };
  }
}
