import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AdminUsersRepository } from '../repositories/admin-users.repository';

@Injectable()
export class GetAdminUserUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly repo: AdminUsersRepository,
  ) {}

  async execute(input: { locale: SupportedLocale; userId: string }) {
    const user = await this.repo.findInternalUserById(input.userId);

    if (!user) {
      throw new NotFoundException({
        messageKey: 'admin.adminUsers.errors.userNotFound',
        error: 'ADMIN_USER_NOT_FOUND',
      });
    }

    return {
      message: this.i18nService.t(
        'admin.adminUsers.success.userFetched',
        input.locale,
      ),
      item: {
        id: user.id,
        displayName: user.displayName ?? null,
        status: user.status,
        tokenVersion: user.tokenVersion,
        defaultLocale: user.defaultLocale ?? null,
        timezone: user.timezone ?? null,
        emails: user.emails.map((e) => e.email),
        phones: user.phones.map((p) => p.phone),
        roles: user.roles.map((r) => r.role),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }
}
