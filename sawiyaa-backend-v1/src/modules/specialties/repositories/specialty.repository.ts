import { Injectable } from '@nestjs/common';
import { ContentLocale, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Specialty repository is the persistence layer for practitioner-specialty catalog records.
 * It does not manage practitioner linkage tables.
 */
@Injectable()
export class SpecialtyRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly categorySelect = {
    id: true,
    name: true,
    nameAr: true,
    nameEn: true,
    slug: true,
    description: true,
    isActive: true,
    sortOrder: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private readonly specialtySelect = {
    id: true,
    slug: true,
    categoryId: true,
    nameAr: true,
    nameEn: true,
    sortOrder: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  private buildSearchFilter(search?: string) {
    const normalizedSearch = search?.trim();
    if (!normalizedSearch) return undefined;

    return {
      OR: [
        {
          slug: {
            contains: normalizedSearch,
            mode: 'insensitive' as const,
          },
        },
        {
          nameAr: {
            contains: normalizedSearch,
            mode: 'insensitive' as const,
          },
        },
        {
          nameEn: {
            contains: normalizedSearch,
            mode: 'insensitive' as const,
          },
        },
        {
          translations: {
            some: {
              title: {
                contains: normalizedSearch,
                mode: 'insensitive' as const,
              },
            },
          },
        },
        {
          category: {
            OR: [
              {
                name: {
                  contains: normalizedSearch,
                  mode: 'insensitive' as const,
                },
              },
              {
                nameAr: {
                  contains: normalizedSearch,
                  mode: 'insensitive' as const,
                },
              },
              {
                nameEn: {
                  contains: normalizedSearch,
                  mode: 'insensitive' as const,
                },
              },
              {
                slug: {
                  contains: normalizedSearch,
                  mode: 'insensitive' as const,
                },
              },
            ],
          },
        },
      ],
    };
  }

  private buildSelectArgs(locale?: SupportedLocale) {
    return {
      ...this.specialtySelect,
      category: {
        select: this.categorySelect,
      },
      translations: {
        where: locale
          ? {
              locale: {
                in: [locale, ContentLocale.en],
              },
            }
          : {
              locale: {
                in: [ContentLocale.ar, ContentLocale.en],
              },
            },
        orderBy: {
          locale: 'asc' as const,
        },
        select: {
          locale: true,
          title: true,
          description: true,
        },
      },
    } as const;
  }

  listActive(locale: SupportedLocale, search?: string) {
    return this.prisma.specialty.findMany({
      where: {
        isActive: true,
        ...this.buildSearchFilter(search),
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { category: { createdAt: 'asc' } },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      select: this.buildSelectArgs(locale),
    });
  }

  listForAdmin(locale: SupportedLocale, search?: string) {
    return this.prisma.specialty.findMany({
      where: this.buildSearchFilter(search),
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { category: { createdAt: 'asc' } },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      select: this.buildSelectArgs(locale),
    });
  }

  findActiveBySlug(slug: string, locale: SupportedLocale) {
    return this.prisma.specialty.findFirst({
      where: {
        isActive: true,
        OR: [
          { slug },
          {
            translations: {
              some: {
                locale,
                slug,
              },
            },
          },
          {
            translations: {
              some: {
                locale: 'en',
                slug,
              },
            },
          },
        ],
      },
      select: this.buildSelectArgs(locale),
    });
  }

  findById(id: string, locale: SupportedLocale, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).specialty.findUnique({
      where: { id },
      select: this.buildSelectArgs(locale),
    });
  }

  findByCanonicalSlug(slug: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).specialty.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  create(input: {
    slug: string;
    nameAr: string;
    nameEn: string;
    categoryId?: string | null;
    sortOrder: number;
    isActive: boolean;
    description?: string | null;
  }) {
    return this.prisma.specialty.create({
      data: {
        slug: input.slug,
        categoryId: input.categoryId ?? null,
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        translations: {
          create: [
            {
              locale: 'ar',
              title: input.nameAr,
              description: input.description ?? null,
              slug: input.slug,
            },
            {
              locale: 'en',
              title: input.nameEn,
              description: input.description ?? null,
              slug: input.slug,
            },
          ],
        },
      },
      select: this.buildSelectArgs('ar'),
    });
  }

  update(
    id: string,
    input: {
      slug?: string;
      nameAr?: string;
      nameEn?: string;
      categoryId?: string | null;
      sortOrder?: number;
      isActive?: boolean;
      description?: string | null;
    },
  ) {
    return this.prisma.specialty.update({
      where: { id },
      data: {
        slug: input.slug,
        categoryId: input.categoryId,
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        translations:
          input.nameAr !== undefined ||
          input.nameEn !== undefined ||
          input.description !== undefined ||
          input.slug !== undefined
            ? {
                upsert: [
                  {
                    where: {
                      specialtyId_locale: {
                        specialtyId: id,
                        locale: 'ar',
                      },
                    },
                    create: {
                      locale: 'ar',
                      title: input.nameAr ?? '',
                      description: input.description ?? null,
                      slug: input.slug ?? '',
                    },
                    update: {
                      title: input.nameAr,
                      description: input.description,
                      slug: input.slug,
                    },
                  },
                  {
                    where: {
                      specialtyId_locale: {
                        specialtyId: id,
                        locale: 'en',
                      },
                    },
                    create: {
                      locale: 'en',
                      title: input.nameEn ?? '',
                      description: input.description ?? null,
                      slug: input.slug ?? '',
                    },
                    update: {
                      title: input.nameEn,
                      description: input.description,
                      slug: input.slug,
                    },
                  },
                ],
              }
            : undefined,
      },
      select: this.buildSelectArgs('ar'),
    });
  }

  toggleStatus(id: string, isActive: boolean, locale: SupportedLocale) {
    return this.prisma.specialty.update({
      where: { id },
      data: { isActive },
      select: this.buildSelectArgs(locale),
    });
  }
}
