import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { I18nService } from '@common/i18n/services/i18n.service';
import { isPresenceEffectivelyOnline } from '@modules/presence/utils/presence-liveness';
import {
  AdminPractitionerGenderDto,
  AdminPractitionerKindDto,
  AdminPractitionerSortByDto,
} from '../dto/list-admin-practitioners.dto';
import { AdminPractitionerDirectoryRepository } from '../repositories/admin-practitioner-directory.repository';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PractitionerStatus, UserStatus } from '@prisma/client';

/**
 * Admin-only practitioner directory listing.
 * This read surface is intentionally independent from public practitioner visibility constraints.
 */
type AdminPractitionerDirectoryRow = {
  id: string;
  publicSlug: string | null;
  status: string;
  isPublicProfilePublished: boolean;
  yearsOfExperience: number | null;
  avatarUrl: string | null;
  practitionerType: string;
  professionalTitle: string | null;
  bio: string | null;
  user: {
    displayName: string | null;
    status: string;
    emails: { email: string }[];
  };
  specialties: { id: string }[];
  country: {
    isoCode: string | null;
  } | null;
  presence: Parameters<typeof isPresenceEffectivelyOnline>[0];
  ratingSummary: {
    averageRating: number | null;
    publishedReviewsCount: number;
  } | null;
};

@Injectable()
export class ListAdminPractitionersDirectoryUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly repository: AdminPractitionerDirectoryRepository,
    private readonly visibilityPolicy: PublicPractitionerVisibilityPolicy,
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

    const directoryRows = rows as unknown as AdminPractitionerDirectoryRow[];

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.applicationsFetched',
        input.locale,
      ),
      items: directoryRows.map((row) => ({
        id: row.id,
        slug: row.publicSlug || row.id,
        displayName: row.user.displayName ?? null,
        email: row.user.emails?.[0]?.email ?? null,
        avatarUrl: row.avatarUrl
          ? `/api/v1/admin/practitioners/${row.id}/avatar`
          : null,
        professionalTitle: row.professionalTitle ?? null,
        status: row.status,
        practitionerType: row.practitionerType,
        accountStatus: row.user.status,
        isPublicProfilePublished: row.isPublicProfilePublished,
        publicationBlockers: this.visibilityPolicy.getBlockers({
          practitionerStatus: row.status as PractitionerStatus,
          userStatus: row.user.status as UserStatus,
          isPublicProfilePublished: row.isPublicProfilePublished,
          hasPublicSlug: Boolean(row.publicSlug?.trim()),
          hasDisplayName: Boolean(row.user.displayName?.trim()),
          hasProfessionalTitle: Boolean(row.professionalTitle?.trim()),
          hasBio: Boolean(row.bio?.trim()),
          hasAtLeastOneActiveSpecialty: row.specialties.length > 0,
        }),
        countryCode: row.country?.isoCode ?? null,
        isOnlineNow: isPresenceEffectivelyOnline(row.presence),
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
