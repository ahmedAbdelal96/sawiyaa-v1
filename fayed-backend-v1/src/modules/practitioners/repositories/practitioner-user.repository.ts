import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * PractitionerUserRepository exposes only user fields that practitioners profile flows are allowed to touch.
 * This keeps boundaries clear between practitioner profile concerns and broader user-management logic.
 */
@Injectable()
export class PractitionerUserRepository {
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
        status: true,
      },
    });
  }

  updateProfilePreferences(
    userId: string,
    data: {
      displayName?: string;
      defaultLocale?: string;
      timezone?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const updateData: Prisma.UserUpdateInput = {};

    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }

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
        status: true,
      },
    });
  }
}

