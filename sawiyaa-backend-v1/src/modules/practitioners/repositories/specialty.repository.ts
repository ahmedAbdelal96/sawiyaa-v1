import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';

/**
 * SpecialtyRepository is read-only from practitioners perspective.
 * It validates and projects existing specialty master data for practitioner linkage responses.
 */
@Injectable()
export class SpecialtyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByIds(ids: string[]) {
    return this.prisma.specialty.findMany({
      where: {
        id: { in: ids },
        isActive: true,
      },
      select: {
        id: true,
      },
    });
  }

  findActiveByIdsWithCategory(ids: string[]) {
    return this.prisma.specialty.findMany({
      where: {
        id: { in: ids },
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        categoryId: true,
      },
    });
  }

  listByPractitionerId(practitionerId: string, locale: SupportedLocale) {
    return this.prisma.practitionerSpecialty.findMany({
      where: { practitionerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      select: {
        specialtyId: true,
        isPrimary: true,
        specialty: {
          select: {
            slug: true,
            categoryId: true,
            translations: {
              where: {
                locale: {
                  in: [locale, 'en'],
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
    });
  }
}
