import { Injectable } from '@nestjs/common';
import {
  PresenceStatus,
  PractitionerGender,
  PractitionerType,
  Prisma,
  UserRoleType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  SessionReviewRatingAggregationService,
  type SessionReviewRatingSummary,
} from '@modules/reviews/services/session-review-rating-aggregation.service';
import { getPresenceFreshnessCutoff } from '@modules/presence/utils/presence-liveness';
import {
  AdminPractitionerGenderDto,
  AdminPractitionerKindDto,
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
  ) {}

  private buildWhere(input: {
    search?: string;
    practitionerKind?: AdminPractitionerKindDto;
    gender?: AdminPractitionerGenderDto;
    country?: string;
    onlineNow?: boolean;
    minRating?: number;
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

    return {
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

    const total = filteredRows.length;
    const pagedRows = filteredRows.slice(input.skip, input.skip + input.take);

    return { rows: pagedRows, total };
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
