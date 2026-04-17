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

  findActiveById(sessionId: string) {
    return this.prisma.userSession.findFirst({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      include: {
        user: {
          include: {
            roles: true,
            emails: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
            phones: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
            practitionerProfile: true,
          },
        },
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
