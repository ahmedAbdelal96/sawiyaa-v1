import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerPayoutDestinationInput } from '../types/practitioner.types';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PractitionerPayoutDestinationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findByPractitionerId(practitionerId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerPayoutDestination.findUnique({
      where: { practitionerId },
    });
  }

  async upsert(
    practitionerId: string,
    data: PractitionerPayoutDestinationInput | null,
    tx?: Prisma.TransactionClient,
  ) {
    if (data === null) {
      await this.getDb(tx).practitionerPayoutDestination.deleteMany({
        where: { practitionerId },
      });
      return null;
    }

    return this.getDb(tx).practitionerPayoutDestination.upsert({
      where: { practitionerId },
      create: {
        practitionerId,
        methodType: data.methodType,
        countryCode: data.countryCode ?? null,
        accountHolderName: data.accountHolderName ?? null,
        bankName: data.bankName ?? null,
        bankAccountNumber: data.bankAccountNumber ?? null,
        iban: data.iban ?? null,
        walletProvider: data.walletProvider ?? null,
        walletIdentifier: data.walletIdentifier ?? null,
        otherDetails: data.otherDetails ?? null,
      },
      update: {
        methodType: data.methodType,
        countryCode: data.countryCode ?? null,
        accountHolderName: data.accountHolderName ?? null,
        bankName: data.bankName ?? null,
        bankAccountNumber: data.bankAccountNumber ?? null,
        iban: data.iban ?? null,
        walletProvider: data.walletProvider ?? null,
        walletIdentifier: data.walletIdentifier ?? null,
        otherDetails: data.otherDetails ?? null,
      },
    });
  }
}
