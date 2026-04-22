import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * PractitionerLanguageRepository manages practitioner-to-language links only.
 * Language master records remain owned by the dedicated language/specialty reference surfaces.
 */
@Injectable()
export class PractitionerLanguageRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  countByPractitionerId(practitionerId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerProfileLanguage.count({
      where: { practitionerId },
    });
  }

  listCodesByPractitionerId(
    practitionerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerProfileLanguage.findMany({
      where: { practitionerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: {
        language: {
          select: {
            code: true,
          },
        },
      },
    });
  }

  replaceAll(
    practitionerId: string,
    links: Array<{ languageId: string; isPrimary: boolean }>,
    tx?: Prisma.TransactionClient,
  ) {
    if (tx) {
      return tx.practitionerProfileLanguage
        .deleteMany({
          where: { practitionerId },
        })
        .then(() =>
          tx.practitionerProfileLanguage.createMany({
            data: links.map((item) => ({
              practitionerId,
              languageId: item.languageId,
              isPrimary: item.isPrimary,
            })),
          }),
        );
    }

    return this.prisma.$transaction([
      this.prisma.practitionerProfileLanguage.deleteMany({
        where: { practitionerId },
      }),
      this.prisma.practitionerProfileLanguage.createMany({
        data: links.map((item) => ({
          practitionerId,
          languageId: item.languageId,
          isPrimary: item.isPrimary,
        })),
      }),
    ]);
  }
}
