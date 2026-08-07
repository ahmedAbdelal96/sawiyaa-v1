import { Injectable } from '@nestjs/common';
import type { SupportedLocale } from '@common/i18n/types/locale.types';
import { AdminPatientDirectoryRepository } from '../repositories/admin-patient-directory.repository';
import type {
  AdminPatientOnboardingDto,
  AdminPatientStatusDto,
} from '../dto/list-admin-patients.dto';
import { AppLoggerService } from '@common/logging/app-logger.service';

@Injectable()
export class ListAdminPatientsUseCase {
  constructor(
    private readonly repository: AdminPatientDirectoryRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    search?: string;
    status?: AdminPatientStatusDto;
    onboarding?: AdminPatientOnboardingDto;
    page?: number;
    limit?: number;
  }) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;
    this.logger.debug(
      {
        message: 'Admin patient directory request',
        search: input.search ?? null,
        status: input.status ?? null,
        onboarding: input.onboarding ?? null,
        page,
        limit,
      },
      ListAdminPatientsUseCase.name,
    );

    const { rows, total, completedOnboarding, incompleteOnboarding } =
      await this.repository.list({
        search: input.search,
        status: input.status,
        onboarding: input.onboarding,
        skip,
        take: limit,
      });
    this.logger.debug(
      {
        message: 'Admin patient directory result',
        search: input.search ?? null,
        rows: rows.length,
        total,
        firstItem: rows[0]
          ? {
              id: rows[0].id,
              userId: rows[0].userId,
              displayName:
                rows[0].user.displayName ?? rows[0].displayName ?? null,
            }
          : null,
      },
      ListAdminPatientsUseCase.name,
    );

    return {
      message: 'Patients fetched successfully.',
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        displayName: row.user.displayName ?? row.displayName ?? null,
        primaryEmail: row.user.emails[0]?.email ?? null,
        primaryPhone: row.user.phones[0]?.phone ?? null,
        status: row.user.status,
        countryCode: row.country?.isoCode ?? null,
        onboardingCompletedAt: row.onboardingCompletedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        completedOnboarding,
        incompleteOnboarding,
      },
    };
  }
}
