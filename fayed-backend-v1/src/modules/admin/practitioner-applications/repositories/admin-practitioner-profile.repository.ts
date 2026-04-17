import { Injectable } from '@nestjs/common';
import { PractitionerStatus, Prisma } from '@prisma/client';
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
      include: {
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
}
