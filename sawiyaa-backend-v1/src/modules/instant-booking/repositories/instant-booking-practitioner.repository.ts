import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PractitionerStatus,
  UserStatus,
} from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class InstantBookingPractitionerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.practitionerProfile.findUnique({
      where: { userId },
      include: this.practitionerInclude,
    });
  }

  findByPublicSlug(slug: string) {
    return this.prisma.practitionerProfile.findFirst({
      where: {
        publicSlug: slug.trim().toLowerCase(),
      },
      include: this.practitionerInclude,
    });
  }

  listEligibleDiscoveryCandidates(input: {
    locale: SupportedLocale;
    currencyCode?: 'EGP' | 'USD' | null;
    durationMinutes?: 30 | 60 | null;
  }) {
    return this.prisma.practitionerProfile.findMany({
      where: this.buildEligibleDiscoveryWhere(input),
      select: {
        id: true,
        publicSlug: true,
        status: true,
        isPublicProfilePublished: true,
        professionalTitle: true,
        bio: true,
        avatarUrl: true,
        yearsOfExperience: true,
        createdAt: true,
        instantBookingPrice30Egp: true,
        instantBookingPrice30Usd: true,
        instantBookingPrice60Egp: true,
        instantBookingPrice60Usd: true,
        user: {
          select: {
            id: true,
            displayName: true,
            status: true,
            timezone: true,
          },
        },
        presence: {
          select: {
            status: true,
            lastSeenAtUtc: true,
            isInstantBookingEnabled: true,
          },
        },
        specialties: {
          where: {
            specialty: {
              isActive: true,
            },
          },
          select: {
            isPrimary: true,
            specialty: {
              select: {
                slug: true,
                translations: {
                  where: {
                    locale: {
                      in: [input.locale, 'en'],
                    },
                  },
                  orderBy: {
                    locale: 'asc',
                  },
                  select: {
                    locale: true,
                    title: true,
                  },
                },
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      } satisfies Prisma.PractitionerProfileSelect,
    });
  }

  private readonly practitionerInclude = {
    user: {
      select: {
        id: true,
        status: true,
        displayName: true,
        timezone: true,
      },
    },
    specialties: {
      where: {
        specialty: {
          isActive: true,
        },
      },
      select: {
        specialtyId: true,
      },
    },
  } as const;

  private buildEligibleDiscoveryWhere(input: {
    currencyCode?: 'EGP' | 'USD' | null;
    durationMinutes?: 30 | 60 | null;
  }): Prisma.PractitionerProfileWhereInput {
    const positivePrice = {
      gt: new Prisma.Decimal(0),
    } as const;

    const priceWhere =
      input.currencyCode === 'EGP'
        ? input.durationMinutes === 30
          ? { instantBookingPrice30Egp: positivePrice }
          : input.durationMinutes === 60
            ? { instantBookingPrice60Egp: positivePrice }
            : {
                OR: [
                  { instantBookingPrice30Egp: positivePrice },
                  { instantBookingPrice60Egp: positivePrice },
                ],
              }
          : input.currencyCode === 'USD'
            ? input.durationMinutes === 30
            ? { instantBookingPrice30Usd: positivePrice }
              : input.durationMinutes === 60
              ? { instantBookingPrice60Usd: positivePrice }
              : {
                  OR: [
                    { instantBookingPrice30Usd: positivePrice },
                    { instantBookingPrice60Usd: positivePrice },
                  ],
                }
            : input.durationMinutes === 30
              ? {
                  OR: [
                    { instantBookingPrice30Egp: positivePrice },
                    { instantBookingPrice30Usd: positivePrice },
                  ],
                }
              : input.durationMinutes === 60
                ? {
                  OR: [
                    { instantBookingPrice60Egp: positivePrice },
                    { instantBookingPrice60Usd: positivePrice },
                  ],
                }
              : {
                  OR: [
                    { instantBookingPrice30Egp: positivePrice },
                    { instantBookingPrice30Usd: positivePrice },
                    { instantBookingPrice60Egp: positivePrice },
                    { instantBookingPrice60Usd: positivePrice },
                  ],
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
      presence: {
        is: {
          isInstantBookingEnabled: true,
        },
      },
      specialties: {
        some: {
          specialty: {
            isActive: true,
          },
        },
      },
      AND: [
        {
          user: {
            displayName: {
              not: '',
            },
          },
        },
        priceWhere,
      ],
    };
  }
}
