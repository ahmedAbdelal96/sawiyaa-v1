import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Phone lookups are separate because OTP routing must only use verified channels.
 */
@Injectable()
export class UserPhoneRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findPrimaryPhoneForUser(userId: string) {
    return this.prisma.userPhone.findFirst({
      where: { userId, isPrimary: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  upsertPrimaryPhone(
    userId: string,
    phone: string,
    isVerified: boolean,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).userPhone.upsert({
      where: { phone },
      create: {
        userId,
        phone,
        isPrimary: true,
        isVerified,
      },
      update: {
        userId,
        isPrimary: true,
        isVerified,
      },
    });
  }
}
