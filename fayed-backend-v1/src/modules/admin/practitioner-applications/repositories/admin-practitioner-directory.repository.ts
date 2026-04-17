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
  constructor(private readonly prisma: PrismaService) {}

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
              },
            }
          : undefined,
      ratingSummary:
        input.minRating !== undefined
          ? {
              is: {
                averageRating: {
                  gte: input.minRating,
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

  private buildOrderBy(sort?: AdminPractitionerSortByDto) {
    if (sort === AdminPractitionerSortByDto.NEWEST) {
      return [{ createdAt: 'desc' as const }];
    }

    if (sort === AdminPractitionerSortByDto.OLDEST) {
      return [{ createdAt: 'asc' as const }];
    }

    if (sort === AdminPractitionerSortByDto.RATING) {
      return [
        { ratingSummary: { averageRating: 'desc' as const } },
        { createdAt: 'desc' as const },
      ];
    }

    if (sort === AdminPractitionerSortByDto.EXPERIENCE) {
      return [
        { yearsOfExperience: 'desc' as const },
        { createdAt: 'desc' as const },
      ];
    }

    return [
      { ratingSummary: { averageRating: 'desc' as const } },
      { yearsOfExperience: 'desc' as const },
      { createdAt: 'desc' as const },
    ];
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
    const orderBy = this.buildOrderBy(input.sort);

    const [rows, total] = await Promise.all([
      this.prisma.practitionerProfile.findMany({
        where,
        select: {
          id: true,
          publicSlug: true,
          professionalTitle: true,
          practitionerType: true,
          status: true,
          yearsOfExperience: true,
          avatarUrl: true,
          user: {
            select: {
              displayName: true,
            },
          },
          country: {
            select: {
              isoCode: true,
            },
          },
          presence: {
            select: {
              status: true,
            },
          },
          ratingSummary: {
            select: {
              averageRating: true,
              publishedReviewsCount: true,
            },
          },
        },
        skip: input.skip,
        take: input.take,
        orderBy,
      }),
      this.prisma.practitionerProfile.count({ where }),
    ]);

    return { rows, total };
  }
}
