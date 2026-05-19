import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';
import { PatchAdminUserDto } from '../dto/patch-admin-user.dto';
import { AdminUserManagementPolicy } from '../policies/admin-user-management.policy';
import { AdminUsersRepository } from '../repositories/admin-users.repository';

@Injectable()
export class PatchAdminUserUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly repo: AdminUsersRepository,
    private readonly policy: AdminUserManagementPolicy,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    actor: AuthenticatedUser;
    userId: string;
    payload: PatchAdminUserDto;
  }) {
    this.policy.assertNotSelf(input.actor.id, input.userId);

    const existing = await this.repo.findInternalUserById(input.userId);
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'admin.adminUsers.errors.userNotFound',
        error: 'ADMIN_USER_NOT_FOUND',
      });
    }

    const updated = await this.repo.patchUser({
      userId: input.userId,
      displayName: input.payload.displayName?.trim(),
      defaultLocale: input.payload.defaultLocale?.trim(),
      timezone: input.payload.timezone?.trim(),
    });

    this.securityAuditService.logAsync({
      action: 'security.adminUsers.update.success',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: input.actor.id,
      actorRoles: input.actor.roles,
      resourceType: 'User',
      resourceId: input.userId,
      targetUserId: input.userId,
      metadata: {
        displayNameChanged:
          typeof input.payload.displayName === 'string' &&
          input.payload.displayName.trim() !== (existing.displayName ?? ''),
        defaultLocaleChanged:
          typeof input.payload.defaultLocale === 'string' &&
          input.payload.defaultLocale.trim() !== (existing.defaultLocale ?? ''),
        timezoneChanged:
          typeof input.payload.timezone === 'string' &&
          input.payload.timezone.trim() !== (existing.timezone ?? ''),
      },
    });

    return {
      message: this.i18nService.t(
        'admin.adminUsers.success.userUpdated',
        input.locale,
      ),
      item: updated,
    };
  }
}
