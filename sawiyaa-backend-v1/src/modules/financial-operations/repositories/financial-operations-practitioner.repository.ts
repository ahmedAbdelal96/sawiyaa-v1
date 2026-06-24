import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class FinancialOperationsPractitionerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.practitionerProfile.findUnique({
      where: {
        userId,
      },
      select: this.practitionerSelect,
    });
  }

  findById(practitionerId: string) {
    return this.prisma.practitionerProfile.findUnique({
      where: {
        id: practitionerId,
      },
      select: this.practitionerSelect,
    });
  }

  private readonly practitionerSelect = {
    id: true,
    publicSlug: true,
    professionalTitle: true,
    payoutDestination: {
      select: {
        methodType: true,
        accountHolderName: true,
        bankName: true,
        bankAccountNumber: true,
        iban: true,
        walletProvider: true,
        walletIdentifier: true,
        otherDetails: true,
      },
    },
    user: {
      select: {
        displayName: true,
      },
    },
    country: {
      select: {
        isoCode: true,
      },
    },
  } as const;
}
