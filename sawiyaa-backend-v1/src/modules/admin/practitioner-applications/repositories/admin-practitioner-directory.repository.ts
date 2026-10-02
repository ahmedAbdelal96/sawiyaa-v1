import { Injectable } from '@nestjs/common';
import {
  PresenceStatus,
  PractitionerGender,
  PractitionerStatus,
  PractitionerType,
  Prisma,
  UserStatus,
  UserRoleType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  SessionReviewRatingAggregationService,
  type SessionReviewRatingSummary,
} from '@modules/reviews/services/session-review-rating-aggregation.service';
import { getPresenceFreshnessCutoff } from '@modules/presence/utils/presence-liveness';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import {
  AdminPractitionerGenderDto,
  AdminPractitionerKindDto,
  AdminPractitionerApplicationStatusDto,
  AdminPractitionerPublicationStatusDto,
  AdminPractitionerReadinessStatusDto,
  AdminPractitionerSortByDto,
} from '../dto/list-admin-practitioners.dto';

/**
 * Admin practitioner directory read repository.
 * Unlike public listing, this surface intentionally does not require public-profile completeness.
 */
@Injectable()
export class AdminPractitionerDirectoryRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionReviewRatingAggregationService: SessionReviewRatingAggregationService,
    private readonly visibilityPolicy: PublicPractitionerVisibilityPolicy,
  ) {}

  private buildWhere(input: {
    search?: string;
    practitionerKind?: AdminPractitionerKindDto;
    gender?: AdminPractitionerGenderDto;
    country?: string;
    onlineNow?: boolean;
    minRating?: number;
    applicationStatus?: AdminPractitionerApplicationStatusDto;
    publicationStatus?: AdminPractitionerPublicationStatusDto;
    readinessStatus?: AdminPractitionerReadinessStatusDto;
  }): Prisma.PractitionerProfileWhereInput {
    const search = input.search?.trim();
    const countryCode = input.country?.trim().toUpperCase();
    const onlineFreshnessCutoff = getPresenceFreshnessCutoff();

    const practitionerTypeFilter =
      input.practitionerKind === AdminPractitionerKindDto.DOCTOR
        ? { practitionerType: PractitionerType.PSYCHIATRIST }
        : input.practitionerKind === AdminPractitionerKindDto.THERAPIST
          ? {
              practitionerType: {
                in: [
                  PractitionerType.PSYCHOLOGIST,
                  PractitionerType.COUNSELOR,
                  PractitionerType.NUTRITIONIST,
                  PractitionerType.WEIGHT_LOSS_SPECIALIST,
                  PractitionerType.OTHER,
                ],
              },
            }
          : undefined;

    const genderFilter =
      input.gender === AdminPractitionerGenderDto.MALE
        ? { practitionerGender: PractitionerGender.MALE }
        : input.gender === AdminPractitionerGenderDto.FEMALE
          ? { practitionerGender: PractitionerGender.FEMALE }
          : undefined;

    const applicationFilter =
      input.applicationStatus === AdminPractitionerApplicationStatusDto.NO_APPLICATION
        ? { applications: { none: {} } }
        : { applications: { some: {} } };

    return {
      ...applicationFilter,
      user: {
        status: 'ACTIVE',
        roles: {
          some: {
            role: UserRoleType.PRACTITIONER,
          },
        },
      },
      ...(practitionerTypeFilter ?? {}),
      ...(genderFilter ?? {}),
      ...(input.publicationStatus === AdminPractitionerPublicationStatusDto.PUBLISHED
        ? { isPublicProfilePublished: true }
        : input.publicationStatus === AdminPractitionerPublicationStatusDto.UNPUBLISHED
          ? { isPublicProfilePublished: false }
          : {}),
      country: countryCode
        ? {
            isoCode: {
              equals: countryCode,
              mode: 'insensitive',
            },
          }
        : undefined,
      presence:
        input.onlineNow === true
          ? {
              is: {
                status: PresenceStatus.ONLINE,
                lastSeenAtUtc: {
                  gte: onlineFreshnessCutoff,
                },
              },
            }
          : undefined,
      OR: search
        ? [
            {
              user: {
                displayName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              user: {
                emails: {
                  some: {
                    email: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
            {
              professionalTitle: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              bio: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              publicSlug: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ]
        : undefined,
    };
  }

  private buildOrderBy(
    sort?: AdminPractitionerSortByDto,
  ): Prisma.PractitionerProfileOrderByWithRelationInput[] {
    if (sort === AdminPractitionerSortByDto.OLDEST) {
      return [{ createdAt: 'asc' }, { id: 'asc' }];
    }

    if (sort === AdminPractitionerSortByDto.EXPERIENCE) {
      return [
        { yearsOfExperience: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ];
    }

    // Rating is decorated after the profile query, so keep its database order
    // deterministic and apply the rating comparison below before pagination.
    return [{ createdAt: 'desc' }, { id: 'desc' }];
  }

  async list(input: {
    search?: string;
    practitionerKind?: AdminPractitionerKindDto;
    gender?: AdminPractitionerGenderDto;
    country?: string;
    onlineNow?: boolean;
    minRating?: number;
    applicationStatus?: AdminPractitionerApplicationStatusDto;
    publicationStatus?: AdminPractitionerPublicationStatusDto;
    readinessStatus?: AdminPractitionerReadinessStatusDto;
    sort?: AdminPractitionerSortByDto;
    skip: number;
    take: number;
  }) {
    const where = this.buildWhere(input);
    const rows = await this.prisma.practitionerProfile.findMany({
      where,
      orderBy: this.buildOrderBy(input.sort),
      select: {
        id: true,
        publicSlug: true,
        professionalTitle: true,
        bio: true,
        sessionPrice30Egp: true,
        sessionPrice30Usd: true,
        sessionPrice60Egp: true,
        sessionPrice60Usd: true,
        practitionerType: true,
        status: true,
        isPublicProfilePublished: true,
        yearsOfExperience: true,
        createdAt: true,
        avatarUrl: true,
        user: {
          select: {
            displayName: true,
            status: true,
            emails: {
              select: {
                email: true,
              },
            },
          },
        },
        specialties: {
          where: { specialty: { isActive: true } },
          select: { id: true },
        },
        country: {
          select: {
            isoCode: true,
          },
        },
        presence: {
          select: {
            status: true,
            lastSeenAtUtc: true,
          },
        },
        applications: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            submittedAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const ratingSummaries =
      await this.sessionReviewRatingAggregationService.aggregateByPractitionerIds(
        rows.map((row) => row.id),
      );

    const decoratedRows = rows.map((row) => ({
      ...row,
      ratingSummary: this.toLegacyRatingSummary(
        ratingSummaries.get(row.id) ?? null,
      ),
    }));

    const filteredRows =
      input.minRating === undefined
        ? decoratedRows
        : decoratedRows.filter((row) => {
            const rating = row.ratingSummary.averageRating;
            return rating !== null && rating >= input.minRating!;
          });

    const applicationFilteredRows =
      input.applicationStatus === undefined ||
      input.applicationStatus === AdminPractitionerApplicationStatusDto.NO_APPLICATION
        ? filteredRows
        : filteredRows.filter(
            (row) => row.applications[0]?.status === input.applicationStatus,
          );

    const readinessFilteredRows =
      input.readinessStatus === undefined
        ? applicationFilteredRows
        : applicationFilteredRows.filter((row) =>
            this.getReadinessStatus(row) === input.readinessStatus,
          );

    const sortMode = input.sort ?? AdminPractitionerSortByDto.NEWEST;
    filteredRows.sort((left, right) => {
      if (sortMode === AdminPractitionerSortByDto.NEWEST) {
        return (
          right.createdAt.getTime() - left.createdAt.getTime() ||
          right.id.localeCompare(left.id)
        );
      }

      if (sortMode === AdminPractitionerSortByDto.OLDEST) {
        return (
          left.createdAt.getTime() - right.createdAt.getTime() ||
          left.id.localeCompare(right.id)
        );
      }

      if (sortMode === AdminPractitionerSortByDto.EXPERIENCE) {
        if ((right.yearsOfExperience ?? 0) !== (left.yearsOfExperience ?? 0)) {
          return (right.yearsOfExperience ?? 0) - (left.yearsOfExperience ?? 0);
        }
        return (
          right.createdAt.getTime() - left.createdAt.getTime() ||
          right.id.localeCompare(left.id)
        );
      }

      const leftRating = left.ratingSummary.averageRating ?? -1;
      const rightRating = right.ratingSummary.averageRating ?? -1;
      if (rightRating !== leftRating) {
        return rightRating - leftRating;
      }

      if ((right.yearsOfExperience ?? 0) !== (left.yearsOfExperience ?? 0)) {
        return (right.yearsOfExperience ?? 0) - (left.yearsOfExperience ?? 0);
      }

      return (
        right.createdAt.getTime() - left.createdAt.getTime() ||
        right.id.localeCompare(left.id)
      );
    });

    const total = readinessFilteredRows.length;
    const pagedRows = readinessFilteredRows.slice(input.skip, input.skip + input.take);

    return { rows: pagedRows, total };
  }

  private getReadinessStatus(row: {
    status: string;
    isPublicProfilePublished: boolean;
    publicSlug: string | null;
    professionalTitle: string | null;
    bio: string | null;
    sessionPrice30Egp: unknown;
    sessionPrice30Usd: unknown;
    sessionPrice60Egp: unknown;
    sessionPrice60Usd: unknown;
    specialties: { id: string }[];
    user: { displayName: string | null; status: string };
  }) {
    const blockers = this.visibilityPolicy.getBlockers({
      practitionerStatus: row.status as PractitionerStatus,
      userStatus: row.user.status as UserStatus,
      isPublicProfilePublished: row.isPublicProfilePublished,
      hasPublicSlug: Boolean(row.publicSlug?.trim()),
      hasDisplayName: Boolean(row.user.displayName?.trim()),
      hasProfessionalTitle: Boolean(row.professionalTitle?.trim()),
      hasBio: Boolean(row.bio?.trim()),
      hasAtLeastOneActiveSpecialty: row.specialties.length > 0,
      sessionPrice30Egp: row.sessionPrice30Egp,
      sessionPrice30Usd: row.sessionPrice30Usd,
      sessionPrice60Egp: row.sessionPrice60Egp,
      sessionPrice60Usd: row.sessionPrice60Usd,
    });
    return blockers.length === 0 ? 'READY' : 'BLOCKED';
  }

  private toLegacyRatingSummary(
    ratingSummary: SessionReviewRatingSummary | null,
  ) {
    return {
      averageRating:
        ratingSummary?.averageRating === null ||
        ratingSummary?.averageRating === undefined
          ? null
          : Number(ratingSummary.averageRating),
      totalReviews: ratingSummary?.publishedRatingsCount ?? 0,
    };
  }
}
