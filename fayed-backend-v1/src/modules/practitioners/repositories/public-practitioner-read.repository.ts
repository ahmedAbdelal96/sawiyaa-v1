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
import { getPresenceFreshnessCutoff } from '@modules/presence/utils/presence-liveness';
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

  private getPublicPractitionerSelect(locale: SupportedLocale) {
    return {
      id: true,
      publicSlug: true,
      status: true,
      isPublicProfilePublished: true,
      professionalTitle: true,
      bio: true,
      practitionerType: true,
      practitionerGender: true,
      countryId: true,
      sessionPrice30: true,
      sessionPrice60: true,
      sessionPrice30Egp: true,
      sessionPrice30Usd: true,
      sessionPrice60Egp: true,
      sessionPrice60Usd: true,
      yearsOfExperience: true,
      avatarUrl: true,
      acceptsPackages: true,
      user: {
        select: {
          id: true,
          displayName: true,
          status: true,
          timezone: true,
        },
      },
      country: {
        select: {
          id: true,
          isoCode: true,
          currencyCode: true,
        },
      },
      languages: {
        select: {
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
        select: {
          specialtyId: true,
          isPrimary: true,
          specialty: {
            select: {
              slug: true,
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
      ratingSummary: {
        select: {
          averageRating: true,
          publishedReviewsCount: true,
        },
      },
      presence: {
        select: {
          status: true,
          lastSeenAtUtc: true,
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
      _count: {
        select: {
          credentials: true,
        },
      },
    } satisfies Prisma.PractitionerProfileSelect;
  }

  private buildPublicWhere(input: {
    search?: string;
    specialtySlug?: string;
    language?: string;
    country?: string;
    currencyCode?: 'EGP' | 'USD' | null;
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
    const onlineFreshnessCutoff = getPresenceFreshnessCutoff(now);
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
    const buildCurrencyAwareFeeFilter = (
      field: 'sessionPrice30' | 'sessionPrice60',
    ): Prisma.PractitionerProfileWhereInput => {
      if (input.currencyCode === 'EGP') {
        return field === 'sessionPrice30'
          ? { sessionPrice30Egp: sessionFeeCondition() }
          : { sessionPrice60Egp: sessionFeeCondition() };
      }

      if (input.currencyCode === 'USD') {
        return field === 'sessionPrice30'
          ? { sessionPrice30Usd: sessionFeeCondition() }
          : { sessionPrice60Usd: sessionFeeCondition() };
      }

      return field === 'sessionPrice30'
        ? { sessionPrice30: sessionFeeCondition() }
        : { sessionPrice60: sessionFeeCondition() };
    };
    const durationFeeWhere =
      input.duration === PublicPractitionerSessionDuration.THIRTY
        ? buildCurrencyAwareFeeFilter('sessionPrice30')
        : input.duration === PublicPractitionerSessionDuration.SIXTY
          ? buildCurrencyAwareFeeFilter('sessionPrice60')
          : hasFeeRange
            ? {
                OR: [
                  buildCurrencyAwareFeeFilter('sessionPrice30'),
                  buildCurrencyAwareFeeFilter('sessionPrice60'),
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
                lastSeenAtUtc: {
                  gte: onlineFreshnessCutoff,
                },
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
    currencyCode?: 'EGP' | 'USD' | null;
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
        select: this.getPublicPractitionerSelect(input.locale),
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
      select: this.getPublicPractitionerSelect(locale),
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
