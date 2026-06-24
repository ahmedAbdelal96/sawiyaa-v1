import { Injectable } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { ListAdminUsersDto } from '../dto/list-admin-users.dto';
import { AdminUsersRepository } from '../repositories/admin-users.repository';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class ListAdminUsersUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly repo: AdminUsersRepository,
  ) {}

  async execute(input: { locale: SupportedLocale; query: ListAdminUsersDto }) {
    const page = input.query.page ?? 1;
    const limit = Math.min(
      input.query.limit ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const skip = (page - 1) * limit;

    const [rows, totalItems] = await Promise.all([
      this.repo.list({
        skip,
        take: limit,
        q: input.query.q,
        role: input.query.role,
        status: input.query.status,
      }),
      this.repo.count({
        q: input.query.q,
        role: input.query.role,
        status: input.query.status,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return {
      message: this.i18nService.t(
        'admin.adminUsers.success.usersFetched',
        input.locale,
      ),
      items: rows.map((row) => ({
        id: row.id,
        displayName: row.displayName ?? null,
        status: row.status,
        primaryEmail: row.emails[0]?.email ?? null,
        primaryPhone: row.phones[0]?.phone ?? null,
        roles: row.roles.map((r) => r.role),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }
}
