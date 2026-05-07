import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Admin user repository provides applicant identity summary fields only.
 * Sensitive auth/session fields are intentionally excluded.
 */
@Injectable()
export class AdminUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findApplicantSummary(userId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).user.findUnique({
      where: { id: userId },
      include: {
        emails: {
          where: { isPrimary: true },
          take: 1,
          select: {
            email: true,
            isVerified: true,
          },
        },
        phones: {
          where: { isPrimary: true },
          take: 1,
          select: {
            phone: true,
            isVerified: true,
          },
        },
      },
    });
  }

  updateProfilePreferences(
    userId: string,
    data: {
      displayName?: string | null;
      defaultLocale?: string | null;
      timezone?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).user.update({
      where: { id: userId },
      data: {
        displayName: data.displayName,
        defaultLocale: data.defaultLocale,
        timezone: data.timezone,
      },
      select: {
        id: true,
        displayName: true,
        defaultLocale: true,
        timezone: true,
      },
    });
  }
}
