import { Injectable } from '@nestjs/common';
import {
  PractitionerGender,
  PractitionerPayoutMethodType,
  PractitionerStatus,
  PractitionerType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Admin practitioner profile repository handles read/update pieces needed for application decisions.
 * It avoids pulling in broader practitioner self-service behavior.
 */
@Injectable()
export class AdminPractitionerProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findById(practitionerId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerProfile.findUnique({
      where: { id: practitionerId },
      select: {
        id: true,
        userId: true,
        publicSlug: true,
        countryId: true,
        primarySpecialtyCategoryId: true,
        practitionerType: true,
        practitionerGender: true,
        status: true,
        avatarUrl: true,
        professionalTitle: true,
        bio: true,
        yearsOfExperience: true,
        sessionPrice30Egp: true,
        sessionPrice30Usd: true,
        sessionPrice60Egp: true,
        sessionPrice60Usd: true,
        instantBookingPrice30Egp: true,
        instantBookingPrice30Usd: true,
        instantBookingPrice60Egp: true,
        instantBookingPrice60Usd: true,
        acceptsPackages: true,
        country: {
          select: {
            isoCode: true,
          },
        },
        languages: {
          include: {
            language: {
              select: {
                code: true,
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
        payoutDestination: true,
      },
    });
  }

  updateStatus(
    practitionerId: string,
    status: PractitionerStatus,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerProfile.update({
      where: { id: practitionerId },
      data: { status },
      select: {
        id: true,
      },
    });
  }

  updateStatusAndPublish(
    practitionerId: string,
    status: PractitionerStatus,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerProfile.update({
      where: { id: practitionerId },
      data: {
        status,
        isPublicProfilePublished: true,
      },
      select: {
        id: true,
        status: true,
        isPublicProfilePublished: true,
      },
    });
  }

  updateAvatar(
    practitionerId: string,
    avatarUrl: string | null,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerProfile.update({
      where: { id: practitionerId },
      data: { avatarUrl },
      select: {
        id: true,
        avatarUrl: true,
      },
    });
  }

  updateProfileDetails(
    practitionerId: string,
    data: {
      practitionerType?: PractitionerType;
      practitionerGender?: PractitionerGender | null;
      professionalTitle?: string | null;
      bio?: string | null;
      yearsOfExperience?: number | null;
      sessionPrice30Egp?: Prisma.Decimal | number | string | null;
      sessionPrice30Usd?: Prisma.Decimal | number | string | null;
      sessionPrice60Egp?: Prisma.Decimal | number | string | null;
      sessionPrice60Usd?: Prisma.Decimal | number | string | null;
      instantBookingPrice30Egp?: Prisma.Decimal | number | string | null;
      instantBookingPrice30Usd?: Prisma.Decimal | number | string | null;
      instantBookingPrice60Egp?: Prisma.Decimal | number | string | null;
      instantBookingPrice60Usd?: Prisma.Decimal | number | string | null;
      countryId?: string | null;
      primarySpecialtyCategoryId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerProfile.update({
      where: { id: practitionerId },
      data: {
        practitionerType: data.practitionerType,
        practitionerGender: data.practitionerGender,
        professionalTitle: data.professionalTitle,
        bio: data.bio,
        yearsOfExperience: data.yearsOfExperience,
        sessionPrice30Egp: data.sessionPrice30Egp,
        sessionPrice30Usd: data.sessionPrice30Usd,
        sessionPrice60Egp: data.sessionPrice60Egp,
        sessionPrice60Usd: data.sessionPrice60Usd,
        instantBookingPrice30Egp: data.instantBookingPrice30Egp,
        instantBookingPrice30Usd: data.instantBookingPrice30Usd,
        instantBookingPrice60Egp: data.instantBookingPrice60Egp,
        instantBookingPrice60Usd: data.instantBookingPrice60Usd,
        countryId: data.countryId,
        primarySpecialtyCategoryId: data.primarySpecialtyCategoryId,
      },
      select: {
        id: true,
      },
    });
  }

  upsertPayoutDestination(
    practitionerId: string,
    data: {
      methodType?: PractitionerPayoutMethodType | null;
      accountHolderName?: string | null;
      bankName?: string | null;
      bankAccountNumber?: string | null;
      iban?: string | null;
      walletProvider?: string | null;
      walletIdentifier?: string | null;
      otherDetails?: string | null;
    } | null,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.getDb(tx);

    if (data === null) {
      return db.practitionerPayoutDestination.deleteMany({
        where: { practitionerId },
      });
    }

    return db.practitionerPayoutDestination.upsert({
      where: { practitionerId },
      create: {
        practitionerId,
        methodType: data.methodType as PractitionerPayoutMethodType,
        accountHolderName: data.accountHolderName ?? null,
        bankName: data.bankName ?? null,
        bankAccountNumber: data.bankAccountNumber ?? null,
        iban: data.iban ?? null,
        walletProvider: data.walletProvider ?? null,
        walletIdentifier: data.walletIdentifier ?? null,
        otherDetails: data.otherDetails ?? null,
      },
      update: {
        methodType: data.methodType as PractitionerPayoutMethodType,
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
