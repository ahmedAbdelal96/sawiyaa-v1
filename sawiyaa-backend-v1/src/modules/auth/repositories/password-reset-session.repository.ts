import { Injectable } from '@nestjs/common';
import { Prisma, UserRoleType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PasswordResetSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  create(
    input: {
      userId: string;
      role: UserRoleType;
      tokenHash: string;
      expiresAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).passwordResetSession.create({
      data: {
        userId: input.userId,
        role: input.role,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  invalidateActiveByUserIdAndRole(
    userId: string,
    role: UserRoleType,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).passwordResetSession.updateMany({
      where: {
        userId,
        role,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        invalidatedAt: new Date(),
      },
    });
  }

  findActiveByTokenHash(tokenHash: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).passwordResetSession.findFirst({
      where: {
        tokenHash,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          include: {
            roles: true,
          },
        },
      },
    });
  }

  consume(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).passwordResetSession.update({
      where: { id },
      data: {
        consumedAt: new Date(),
      },
    });
  }
}
