import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AdminUsersRepository } from '../repositories/admin-users.repository';

@Injectable()
export class ListAdminUserPermissionOverridesUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly repo: AdminUsersRepository,
  ) {}

  async execute(input: { locale: SupportedLocale; userId: string }) {
    const isInternal = await this.repo.isInternalUser(input.userId);
    if (!isInternal) {
      throw new NotFoundException({
        messageKey: 'admin.adminUsers.errors.userNotFound',
        error: 'ADMIN_USER_NOT_FOUND',
      });
    }

    const rows = await this.repo.listPermissionOverrides(input.userId);

    return {
      message: this.i18nService.t(
        'admin.adminUsers.success.permissionOverridesFetched',
        input.locale,
      ),
      items: rows.map((row) => ({
        permissionKey: row.permission.key,
        effect: row.effect,
        reason: row.reason ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }
}
