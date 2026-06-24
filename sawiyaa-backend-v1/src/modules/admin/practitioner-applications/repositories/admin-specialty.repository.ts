import { Injectable } from '@nestjs/common';
import { ContentLocale, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Admin specialty repository resolves specialty labels/slugs for linked specialty ids.
 * It reads from specialty source-of-truth without mutating that catalog.
 */
@Injectable()
export class AdminSpecialtyRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  listByIds(
    ids: string[],
    locale: SupportedLocale,
    tx?: Prisma.TransactionClient,
  ): Promise<
    Array<{
      id: string;
      slug: string;
      categoryId: string | null;
      translations: Array<{ locale: ContentLocale; title: string }>;
    }>
  > {
    if (ids.length === 0) {
      return Promise.resolve<
        Array<{
          id: string;
          slug: string;
          categoryId: string | null;
          translations: Array<{ locale: ContentLocale; title: string }>;
        }>
      >([]);
    }

    return this.getDb(tx).specialty.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: {
        translations: {
          where: {
            locale: {
              in: [locale as ContentLocale, ContentLocale.en],
            },
          },
          orderBy: { locale: 'asc' },
          select: {
            locale: true,
            title: true,
          },
        },
      },
    });
  }
}
