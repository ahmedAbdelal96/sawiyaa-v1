import { Injectable } from '@nestjs/common';
import { Prisma, PractitionerStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * PractitionerProfileRepository owns baseline practitioner profile persistence for this module.
 * It intentionally excludes availability/sessions/financial concerns handled in other modules.
 */
@Injectable()
export class PractitionerProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findByUserId(userId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerProfile.findUnique({
      where: { userId },
      include: {
        country: {
          select: {
            isoCode: true,
          },
        },
        payoutDestination: true,
      },
    });
  }

  createDraft(
    data: {
      userId: string;
      publicSlug: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerProfile.create({
      data: {
        ...data,
        status: PractitionerStatus.DRAFT,
      },
      include: {
        country: {
          select: {
            isoCode: true,
          },
        },
        payoutDestination: true,
      },
    });
  }

  updateByUserId(
    userId: string,
    data: Prisma.PractitionerProfileUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerProfile.update({
      where: { userId },
      data,
      include: {
        country: {
          select: {
            isoCode: true,
          },
        },
        payoutDestination: true,
      },
    });
  }

  async updateAvatarByUserId(
    userId: string,
    avatarUrl: string | null,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerProfile.update({
      where: { userId },
      data: { avatarUrl },
      select: {
        id: true,
        avatarUrl: true,
      },
    });
  }
}
