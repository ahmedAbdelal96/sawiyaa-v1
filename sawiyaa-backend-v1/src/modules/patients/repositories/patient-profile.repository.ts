import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * PatientProfileRepository owns patient-profile persistence for the module.
 * The queries are shaped specifically for baseline profile read/write flows, not for bookings or medical data.
 */
@Injectable()
export class PatientProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findByUserId(userId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).patientProfile.findUnique({
      where: { userId },
      include: {
        country: {
          select: {
            id: true,
            isoCode: true,
          },
        },
      },
    });
  }

  findCountryIdByUserId(userId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).patientProfile.findUnique({
      where: { userId },
      select: { countryId: true },
    });
  }

  create(
    data: Prisma.PatientProfileUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).patientProfile.create({
      data,
      include: {
        country: {
          select: {
            id: true,
            isoCode: true,
          },
        },
      },
    });
  }

  updateByUserId(
    userId: string,
    data: Prisma.PatientProfileUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).patientProfile.update({
      where: { userId },
      data,
      include: {
        country: {
          select: {
            id: true,
            isoCode: true,
          },
        },
      },
    });
  }

  updateCountry(
    userId: string,
    countryId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).patientProfile.update({
      where: { userId },
      data: { countryId },
      include: {
        country: {
          select: {
            id: true,
            isoCode: true,
            name: true,
          },
        },
      },
    });
  }
}
