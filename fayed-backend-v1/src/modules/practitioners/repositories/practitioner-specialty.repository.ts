import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * PractitionerSpecialtyRepository manages only practitioner-to-specialty linkage records.
 * It does not create or modify specialty master data.
 */
@Injectable()
export class PractitionerSpecialtyRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  countByPractitionerId(practitionerId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerSpecialty.count({
      where: { practitionerId },
    });
  }

  replaceAll(
    practitionerId: string,
    specialties: Array<{
      specialtyId: string;
      isPrimary: boolean;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    if (tx) {
      return tx.practitionerSpecialty
        .deleteMany({
          where: { practitionerId },
        })
        .then(() =>
          tx.practitionerSpecialty.createMany({
            data: specialties.map((item) => ({
              practitionerId,
              specialtyId: item.specialtyId,
              isPrimary: item.isPrimary,
            })),
          }),
        );
    }

    return this.prisma.$transaction([
      this.prisma.practitionerSpecialty.deleteMany({
        where: { practitionerId },
      }),
      this.prisma.practitionerSpecialty.createMany({
        data: specialties.map((item) => ({
          practitionerId,
          specialtyId: item.specialtyId,
          isPrimary: item.isPrimary,
        })),
      }),
    ]);
  }
}
