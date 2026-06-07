import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * PatientUserRepository exposes only the user columns that Patients Module is allowed to read/write:
 * display context and lightweight preferences such as locale and timezone.
 */
@Injectable()
export class PatientUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findProfileSeed(userId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        defaultLocale: true,
        timezone: true,
      },
    });
  }

  findById(userId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        status: true,
        roles: true,
      },
    });
  }

  updatePreferences(
    userId: string,
    data: {
      defaultLocale?: string | null;
      timezone?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const updateData: Prisma.UserUpdateInput = {};

    if (data.defaultLocale !== undefined) {
      updateData.defaultLocale = data.defaultLocale;
    }

    if (data.timezone !== undefined) {
      updateData.timezone = data.timezone;
    }

    if (Object.keys(updateData).length === 0) {
      return this.findProfileSeed(userId, tx);
    }

    return this.getDb(tx).user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        displayName: true,
        defaultLocale: true,
        timezone: true,
      },
    });
  }
}
