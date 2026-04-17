import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { I18nService } from '@common/i18n/services/i18n.service';
import {
  AdminPractitionerGenderDto,
  AdminPractitionerKindDto,
  AdminPractitionerSortByDto,
} from '../dto/list-admin-practitioners.dto';
import { AdminPractitionerDirectoryRepository } from '../repositories/admin-practitioner-directory.repository';

/**
 * Admin-only practitioner directory listing.
 * This read surface is intentionally independent from public practitioner visibility constraints.
 */
@Injectable()
export class ListAdminPractitionersDirectoryUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly repository: AdminPractitionerDirectoryRepository,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    search?: string;
    practitionerKind?: AdminPractitionerKindDto;
    gender?: AdminPractitionerGenderDto;
    country?: string;
    onlineNow?: boolean;
    minRating?: number;
    sort?: AdminPractitionerSortByDto;
    page?: number;
    limit?: number;
  }) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;

    const { rows, total } = await this.repository.list({
      search: input.search,
      practitionerKind: input.practitionerKind,
      gender: input.gender,
      country: input.country,
      onlineNow: input.onlineNow,
      minRating: input.minRating,
      sort: input.sort,
      skip,
      take: limit,
    });

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.applicationsFetched',
        input.locale,
      ),
      items: rows.map((row) => ({
        id: row.id,
        slug: row.publicSlug || row.id,
        displayName: row.user.displayName ?? null,
        avatarUrl: row.avatarUrl ?? null,
        professionalTitle: row.professionalTitle ?? null,
        practitionerType: row.practitionerType,
        countryCode: row.country?.isoCode ?? null,
        isOnlineNow: row.presence?.status === 'ONLINE',
        isVerified: row.status === 'APPROVED',
        yearsExperience: row.yearsOfExperience ?? null,
        ratingSummary: {
          averageRating:
            row.ratingSummary?.averageRating === null ||
            row.ratingSummary?.averageRating === undefined
              ? null
              : Number(row.ratingSummary.averageRating),
          totalReviews: row.ratingSummary?.publishedReviewsCount ?? 0,
        },
      })),
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
