import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    slug: true,
    description: true,
    isActive: true,
    sortOrder: true,
  } as const;

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  listActive(locale: SupportedLocale, search?: string) {
    return this.prisma.specialty.findMany({
      where: {
        isActive: true,
        translations: search
          ? {
              some: {
                title: {
                  contains: search.trim(),
                  mode: 'insensitive',
                },
              },
            }
          : undefined,
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { category: { createdAt: 'asc' } },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        category: {
          select: this.categorySelect,
        },
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
            description: true,
          },
        },
      },
    });
  }

  listForAdmin(locale: SupportedLocale, search?: string) {
    return this.prisma.specialty.findMany({
      where: {
        translations: search
          ? {
              some: {
                title: {
                  contains: search.trim(),
                  mode: 'insensitive',
                },
              },
            }
          : undefined,
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { category: { createdAt: 'asc' } },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        category: {
          select: this.categorySelect,
        },
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
            description: true,
          },
        },
      },
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
      include: {
        category: {
          select: this.categorySelect,
        },
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
            description: true,
          },
        },
      },
    });
  }

  findById(id: string, locale: SupportedLocale, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).specialty.findUnique({
      where: { id },
      include: {
        category: {
          select: this.categorySelect,
        },
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
            description: true,
          },
        },
      },
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
    categoryId?: string | null;
    sortOrder: number;
    isActive: boolean;
    locale: SupportedLocale;
    title: string;
    description?: string | null;
  }) {
    return this.prisma.specialty.create({
      data: {
        slug: input.slug,
        categoryId: input.categoryId ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        translations: {
          create: {
            locale: input.locale,
            title: input.title,
            description: input.description ?? null,
            slug: input.slug,
          },
        },
      },
      include: {
        category: {
          select: this.categorySelect,
        },
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
            description: true,
          },
        },
      },
    });
  }

  update(
    id: string,
    input: {
      slug?: string;
      categoryId?: string | null;
      sortOrder?: number;
      isActive?: boolean;
      locale: SupportedLocale;
      translation?: {
        createTitle: string;
        updateTitle?: string;
        updateDescription?: string | null;
        translationSlug?: string;
      };
    },
  ) {
    return this.prisma.specialty.update({
      where: { id },
      data: {
        slug: input.slug,
        categoryId: input.categoryId,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        translations:
          input.translation
            ? {
                upsert: {
                  where: {
                    specialtyId_locale: {
                      specialtyId: id,
                      locale: input.locale,
                    },
                  },
                  create: {
                    locale: input.locale,
                    title: input.translation.createTitle,
                    description: input.translation.updateDescription ?? null,
                    slug: input.translation.translationSlug ?? input.slug ?? '',
                  },
                  update: {
                    title: input.translation.updateTitle,
                    description: input.translation.updateDescription,
                    slug: input.translation.translationSlug,
                  },
                },
              }
            : undefined,
      },
      include: {
        category: {
          select: this.categorySelect,
        },
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
            description: true,
          },
        },
      },
    });
  }

  toggleStatus(id: string, isActive: boolean, locale: SupportedLocale) {
    return this.prisma.specialty.update({
      where: { id },
      data: { isActive },
      include: {
        category: {
          select: this.categorySelect,
        },
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
            description: true,
          },
        },
      },
    });
  }
}
