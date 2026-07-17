import { Injectable } from '@nestjs/common';
import { OtpPurpose, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * OTP challenge repository keeps reusable challenge persistence isolated.
 */
@Injectable()
export class OtpChallengeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async withTransaction<T>(
    run: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(run);
  }

  async lockScope(tx: Prisma.TransactionClient, scopeKey: string) {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${scopeKey})::bigint)
    `;
  }

  create(data: Prisma.OtpChallengeCreateInput, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).otpChallenge.create({ data });
  }

  findById(challengeId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).otpChallenge.findUnique({
      where: { id: challengeId },
      include: { user: { include: { roles: true } } },
    });
  }

  findActiveById(challengeId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).otpChallenge.findFirst({
      where: {
        id: challengeId,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { include: { roles: true } } },
    });
  }

  findLatestActiveByTarget(
    target: string,
    purpose: OtpPurpose,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).otpChallenge.findFirst({
      where: {
        target,
        purpose,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findLatestActiveByUserId(
    userId: string,
    purpose: OtpPurpose,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).otpChallenge.findFirst({
      where: {
        userId,
        purpose,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { include: { roles: true } } },
    });
  }

  incrementAttemptCount(challengeId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).otpChallenge.update({
      where: { id: challengeId },
      data: { attemptCount: { increment: 1 } },
    });
  }

  consume(challengeId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).otpChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    });
  }

  invalidate(challengeId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).otpChallenge.update({
      where: { id: challengeId },
      data: { invalidatedAt: new Date() },
    });
  }

  async invalidateActiveChallengesByScope(
    input: {
      userId?: string | null;
      target?: string | null;
      purpose: OtpPurpose;
      reason?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.getDb(tx);
    const now = new Date();
    const where = {
      purpose: input.purpose,
      consumedAt: null,
      invalidatedAt: null,
      expiresAt: { gt: now },
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.target ? { target: input.target } : {}),
    } as const;

    const activeChallenges = await db.otpChallenge.findMany({
      where,
      select: {
        id: true,
        metadata: true,
      },
    });

    if (activeChallenges.length === 0) {
      return 0;
    }

    for (const challenge of activeChallenges) {
      await db.otpChallenge.update({
        where: { id: challenge.id },
        data: {
          invalidatedAt: now,
          metadata: {
            ...(challenge.metadata &&
            typeof challenge.metadata === 'object' &&
            !Array.isArray(challenge.metadata)
              ? (challenge.metadata as Record<string, unknown>)
              : {}),
            invalidationReason: input.reason ?? 'SUPERSEDED_BY_NEW_OTP',
            invalidatedAt: now.toISOString(),
          },
        },
      });
    }

    return activeChallenges.length;
  }

  listRecentChallengesForTarget(
    target: string,
    purpose: OtpPurpose,
    since: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).otpChallenge.findMany({
      where: {
        target,
        purpose,
        createdAt: { gt: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
  }
}
