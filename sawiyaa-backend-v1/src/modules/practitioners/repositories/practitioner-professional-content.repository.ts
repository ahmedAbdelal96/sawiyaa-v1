import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

const professionalContentSelect = {
  id: true,
  primaryContentLocale: true,
  professionalTitle: true,
  bio: true,
  professionalContentTranslations: {
    orderBy: { locale: 'asc' as const },
    select: {
      locale: true,
      professionalTitle: true,
      bio: true,
    },
  },
} as const;

export type PractitionerProfessionalContentRecord =
  Prisma.PractitionerProfileGetPayload<{
    select: typeof professionalContentSelect;
  }>;

/**
 * Read foundation for professional content. It loads the legacy fields and
 * all live locale rows in one Prisma query for presentation projections;
 * public search predicates use the same relation database-side.
 */
@Injectable()
export class PractitionerProfessionalContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByPractitionerProfileId(
    practitionerProfileId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerProfile.findUnique({
      where: { id: practitionerProfileId },
      select: professionalContentSelect,
    });
  }

  findByPractitionerProfileIds(
    practitionerProfileIds: string[],
    tx?: Prisma.TransactionClient,
  ) {
    if (practitionerProfileIds.length === 0) {
      return Promise.resolve([] as PractitionerProfessionalContentRecord[]);
    }

    return this.getDb(tx).practitionerProfile.findMany({
      where: { id: { in: practitionerProfileIds } },
      select: professionalContentSelect,
    });
  }

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }
}
