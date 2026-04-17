import { Injectable } from '@nestjs/common';
import { Prisma, PractitionerStatus, UserStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class MatchingCandidateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicCandidates(input: {
    locale: SupportedLocale;
    preferredSpecialtySlug?: string | null;
    take: number;
  }) {
    const specialtySlug = input.preferredSpecialtySlug?.trim().toLowerCase();
    const where: Prisma.PractitionerProfileWhereInput = {
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
      specialties: specialtySlug
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
          },
    };

    return this.prisma.practitionerProfile.findMany({
      where,
      take: input.take,
      orderBy: [
        {
          ratingSummary: {
            averageRating: 'desc',
          },
        },
        {
          yearsOfExperience: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      include: {
        user: {
          select: {
            id: true,
            status: true,
            displayName: true,
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
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
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
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        presence: {
          select: {
            status: true,
            isInstantBookingEnabled: true,
            lastSeenAtUtc: true,
          },
        },
        availabilitySlots: {
          where: { isActive: true },
          select: { id: true },
          take: 1,
        },
      },
    });
  }
}
