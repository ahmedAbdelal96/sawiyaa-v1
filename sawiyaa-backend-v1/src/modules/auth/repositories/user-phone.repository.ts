import { ConflictException, Injectable } from '@nestjs/common';
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
    const db = this.getDb(tx);
    return db.userPhone
      .findUnique({
        where: { phone },
        select: { id: true, userId: true },
      })
      .then((existing) => {
        if (existing && existing.userId !== userId) {
          throw new ConflictException({
            messageKey: 'auth.errors.phoneAlreadyRegistered',
            error: 'PHONE_ALREADY_REGISTERED',
          });
        }

        return db.userPhone.upsert({
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
      });
  }
}
