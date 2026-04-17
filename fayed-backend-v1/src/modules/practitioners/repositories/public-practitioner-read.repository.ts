import { Injectable } from '@nestjs/common';
import {
  CouponStatus,
  PresenceStatus,
  PractitionerGender,
  CredentialReviewStatus,
  Prisma,
  PractitionerType,
  PractitionerStatus,
  UserStatus,
} from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  PublicPractitionerGender,
  PublicPractitionerKind,
  PublicPractitionerSessionDuration,
  PublicPractitionerSortBy,
} from '../dto/list-public-practitioners.dto';

/**
 * Repository for public practitioner reads only.
 * It intentionally enforces approved/active/public-ready preconditions at query level.
 */
@Injectable()
export class PublicPractitionerReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildPublicWhere(input: {
    search?: string;
    specialtySlug?: string;
    language?: string;
    country?: string;
    practitionerKind?: PublicPractitionerKind;
    gender?: PublicPractitionerGender;
    duration?: PublicPractitionerSessionDuration;
    onlineNow?: boolean;
    availableToday?: boolean;
    availableThisWeek?: boolean;
    acceptsCoupon?: boolean;
    acceptsPackage?: boolean;
    minRating?: number;
    minSessionFee?: number;
    maxSessionFee?: number;
  }): Prisma.PractitionerProfileWhereInput {
    const now = new Date();
    const search = input.search?.trim();
    const specialtySlug = input.specialtySlug?.trim().toLowerCase();
    const languageCode = input.language?.trim().toLowerCase();
    const countryCode = input.country?.trim().toUpperCase();
    const minSessionFee = input.minSessionFee;
    const maxSessionFee = input.maxSessionFee;
    const nextWeekday = (() => {
      const utcDay = now.getUTCDay();
      const map = [
        'SUNDAY',
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
      ] as const;
      return map[utcDay];
    })();
    const hasFeeRange =
      minSessionFee !== undefined || maxSessionFee !== undefined;
    const sessionFeeCondition = () => ({
      not: null,
      ...(minSessionFee !== undefined ? { gte: minSessionFee } : {}),
      ...(maxSessionFee !== undefined ? { lte: maxSessionFee } : {}),
    });
    const buildFeeFilter = (field: 'sessionPrice30' | 'sessionPrice60') => ({
      [field]: sessionFeeCondition(),
    });
    const durationFeeWhere =
      input.duration === PublicPractitionerSessionDuration.THIRTY
        ? {
            sessionPrice30: sessionFeeCondition(),
          }
        : input.duration === PublicPractitionerSessionDuration.SIXTY
          ? {
              sessionPrice60: sessionFeeCondition(),
            }
          : hasFeeRange
            ? {
                OR: [
                  buildFeeFilter('sessionPrice30'),
                  buildFeeFilter('sessionPrice60'),
                ],
              }
            : undefined;

    const practitionerTypeFilter =
      input.practitionerKind === PublicPractitionerKind.DOCTOR
        ? { practitionerType: PractitionerType.PSYCHIATRIST }
        : input.practitionerKind === PublicPractitionerKind.THERAPIST
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
      input.gender === PublicPractitionerGender.MALE
        ? { practitionerGender: PractitionerGender.MALE }
        : input.gender === PublicPractitionerGender.FEMALE
          ? { practitionerGender: PractitionerGender.FEMALE }
          : undefined;

    const specialtyWhere = specialtySlug
      ? {
          some: {
            specialty: {
              isActive: true,
              OR: [
                { slug: specialtySlug },
                {
                  translations: {
                    some: {
                      slug: specialtySlug,
                    },
                  },
                },
              ],
            },
          },
        }
      : {
          some: {
            specialty: {
              isActive: true,
            },
          },
        };

    return {
      status: PractitionerStatus.APPROVED,
      isPublicProfilePublished: true,
      user: {
        status: UserStatus.ACTIVE,
        displayName: {
          not: null,
        },
      },
      publicSlug: {
        not: '',
      },
      professionalTitle: {
        not: null,
      },
      bio: {
        not: null,
      },
      AND: [
        {
          user: {
            displayName: {
              not: '',
            },
          },
        },
        ...(durationFeeWhere ? [durationFeeWhere] : []),
        ...(practitionerTypeFilter ? [practitionerTypeFilter] : []),
        ...(genderFilter ? [genderFilter] : []),
      ],
      country: countryCode
        ? {
            isoCode: {
              equals: countryCode,
              mode: 'insensitive',
            },
          }
        : undefined,
      specialties: specialtyWhere,
      languages: languageCode
        ? {
            some: {
              language: {
                code: languageCode,
                isActive: true,
              },
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
      availabilitySlots:
        input.availableToday === true
          ? {
              some: {
                isActive: true,
                weekday: nextWeekday,
              },
            }
          : input.availableThisWeek === true
            ? {
                some: {
                  isActive: true,
                },
              }
            : undefined,
      coupons:
        input.acceptsCoupon === true
          ? {
              some: {
                isActive: true,
                status: CouponStatus.APPROVED,
                OR: [{ startsAt: null }, { startsAt: { lte: now } }],
                AND: [
                  {
                    OR: [{ endsAt: null }, { endsAt: { gte: now } }],
                  },
                ],
              },
            }
          : input.acceptsCoupon === false
            ? {
                none: {
                  isActive: true,
                  status: CouponStatus.APPROVED,
                  OR: [{ startsAt: null }, { startsAt: { lte: now } }],
                  AND: [
                    {
                      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
                    },
                  ],
                },
              }
            : undefined,
      acceptsPackages:
        input.acceptsPackage === undefined ? undefined : input.acceptsPackage,
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
              specialties: {
                some: {
                  specialty: {
                    isActive: true,
                    translations: {
                      some: {
                        title: {
                          contains: search,
                          mode: 'insensitive',
                        },
                      },
                    },
                  },
                },
              },
            },
          ]
        : undefined,
    };
  }

  private buildOrderBy(
    sort: PublicPractitionerSortBy | undefined,
  ): Prisma.PractitionerProfileOrderByWithRelationInput[] {
    switch (sort) {
      case PublicPractitionerSortBy.EXPERIENCE:
        return [{ yearsOfExperience: 'desc' }, { createdAt: 'desc' }];
      case PublicPractitionerSortBy.RATING:
        return [
          { ratingSummary: { averageRating: 'desc' } },
          { yearsOfExperience: 'desc' },
          { createdAt: 'desc' },
        ];
      case PublicPractitionerSortBy.RECOMMENDED:
      default:
        return [
          { ratingSummary: { averageRating: 'desc' } },
          { yearsOfExperience: 'desc' },
          { createdAt: 'desc' },
        ];
    }
  }

  async listPublic(input: {
    locale: SupportedLocale;
    search?: string;
    specialtySlug?: string;
    language?: string;
    country?: string;
    practitionerKind?: PublicPractitionerKind;
    gender?: PublicPractitionerGender;
    duration?: PublicPractitionerSessionDuration;
    onlineNow?: boolean;
    availableToday?: boolean;
    availableThisWeek?: boolean;
    acceptsCoupon?: boolean;
    acceptsPackage?: boolean;
    minRating?: number;
    minSessionFee?: number;
    maxSessionFee?: number;
    sort?: PublicPractitionerSortBy;
    skip: number;
    take: number;
  }) {
    const where = this.buildPublicWhere(input);

    const [rows, total] = await Promise.all([
      this.prisma.practitionerProfile.findMany({
        where,
        orderBy: this.buildOrderBy(input.sort),
        skip: input.skip,
        take: input.take,
        include: {
          user: {
            select: {
              displayName: true,
              status: true,
            },
          },
          country: {
            select: {
              isoCode: true,
            },
          },
          languages: {
            include: {
              language: {
                select: {
                  code: true,
                },
              },
            },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
          },
          specialties: {
            where: {
              specialty: {
                isActive: true,
              },
            },
            include: {
              specialty: {
                include: {
                  translations: {
                    where: {
                      locale: {
                        in: [input.locale, 'en'],
                      },
                    },
                    orderBy: { locale: 'asc' },
                    select: {
                      locale: true,
                      title: true,
                    },
                  },
                },
              },
            },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
          },
          ratingSummary: {
            select: {
              averageRating: true,
              publishedReviewsCount: true,
            },
          },
          presence: {
            select: {
              status: true,
            },
          },
          coupons: {
            where: {
              isActive: true,
              status: CouponStatus.APPROVED,
            },
            select: {
              startsAt: true,
              endsAt: true,
              isActive: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.practitionerProfile.count({ where }),
    ]);

    return { rows, total };
  }

  findByPublicSlug(slug: string, locale: SupportedLocale) {
    return this.prisma.practitionerProfile.findFirst({
      where: {
        ...this.buildPublicWhere({}),
        publicSlug: slug.trim().toLowerCase(),
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            status: true,
          },
        },
        country: {
          select: {
            isoCode: true,
          },
        },
        languages: {
          include: {
            language: {
              select: {
                code: true,
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
        specialties: {
          where: {
            specialty: {
              isActive: true,
            },
          },
          include: {
            specialty: {
              include: {
                translations: {
                  where: {
                    locale: {
                      in: [locale, 'en'],
                    },
                  },
                  orderBy: { locale: 'asc' },
                  select: {
                    locale: true,
                    title: true,
                  },
                },
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
        _count: {
          select: {
            credentials: true,
          },
        },
        ratingSummary: {
          select: {
            averageRating: true,
            publishedReviewsCount: true,
          },
        },
      },
    });
  }

  countApprovedCredentials(practitionerId: string) {
    return this.prisma.practitionerCredential.count({
      where: {
        practitionerId,
        reviewStatus: CredentialReviewStatus.APPROVED,
      },
    });
  }
}
