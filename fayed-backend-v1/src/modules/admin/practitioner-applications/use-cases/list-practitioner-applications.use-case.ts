import { Injectable } from '@nestjs/common';
import { PractitionerApplicationStatus, PractitionerStatus } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerApplicationsAdminMapper } from '../mappers/practitioner-applications-admin.mapper';
import { AdminPractitionerApplicationRepository } from '../repositories/admin-practitioner-application.repository';
import {
  AdminPractitionerApplicationKind,
  AdminPractitionerApplicationListView,
} from '../types/practitioner-applications-admin.types';

/**
 * Lists practitioner applications for admin review queues.
 * This read flow keeps admin-facing list shape stable and avoids exposing raw nested prisma records.
 */
@Injectable()
export class ListPractitionerApplicationsUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly mapper: PractitionerApplicationsAdminMapper,
    private readonly applicationRepository: AdminPractitionerApplicationRepository,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    view?: AdminPractitionerApplicationListView;
    kind?: AdminPractitionerApplicationKind;
    status?: PractitionerApplicationStatus;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.applicationRepository.list({
        view: input.view ?? AdminPractitionerApplicationListView.ACTIVE,
        kind: input.kind,
        status: input.status,
        search: input.q,
        skip,
        take: limit,
      }),
      this.applicationRepository.count({
        view: input.view ?? AdminPractitionerApplicationListView.ACTIVE,
        kind: input.kind,
        status: input.status,
        search: input.q,
      }),
    ]);
    const summary = await this.applicationRepository.summary();

    const applications = rows.map((item) => {
      const primarySpecialty = item.practitioner.specialties[0];

      return this.mapper.toListItem({
        applicationId: item.id,
        practitionerProfileId: item.practitionerId,
        userId: item.practitioner.user.id,
        displayName: item.practitioner.user.displayName ?? null,
        practitionerType: item.practitioner.practitionerType,
        countryCode: item.practitioner.country?.isoCode ?? null,
        applicationKind:
          item.practitioner.status === PractitionerStatus.APPROVED
            ? AdminPractitionerApplicationKind.EDIT_REQUEST
            : AdminPractitionerApplicationKind.NEW_APPLICATION,
        mainSpecialty: primarySpecialty
          ? {
              specialtyId: primarySpecialty.specialtyId,
              slug: primarySpecialty.specialty.slug,
              title: this.mapper.pickLocalizedTitle(
                primarySpecialty.specialty.translations,
                input.locale,
              ),
            }
          : null,
        applicationStatus: item.status,
        submittedAt: item.submittedAt,
        updatedAt: item.updatedAt,
      });
    });

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.applicationsFetched',
        input.locale,
      ),
      applications,
      pagination: {
        page,
        limit,
        total,
      },
      summary,
    };
  }
}
