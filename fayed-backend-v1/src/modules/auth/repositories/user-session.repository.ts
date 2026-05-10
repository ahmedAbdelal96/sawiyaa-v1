import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Sessions are persisted so refresh rotation and logout can revoke server-side state.
 */
@Injectable()
export class UserSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  create(
    data: Prisma.UserSessionUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).userSession.create({ data });
  }

  findActiveById(sessionId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).userSession.findFirst({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      select: {
        id: true,
        userId: true,
        refreshTokenHash: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            displayName: true,
            status: true,
            tokenVersion: true,
            roles: true,
            emails: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
              select: {
                email: true,
                isPrimary: true,
                isVerified: true,
              },
            },
            phones: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
              select: {
                phone: true,
                isPrimary: true,
                isVerified: true,
              },
            },
            practitionerProfile: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  countActiveByUserId(userId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).userSession.count({
      where: {
        userId,
        revokedAt: null,
      },
    });
  }

  updateRefreshSession(
    sessionId: string,
    data: Prisma.UserSessionUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).userSession.update({
      where: { id: sessionId },
      data,
    });
  }

  revoke(sessionId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).userSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  revokeAllActiveForUser(userId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
