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

  create(data: Prisma.OtpChallengeCreateInput, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).otpChallenge.create({ data });
  }

  findActiveById(challengeId: string) {
    return this.prisma.otpChallenge.findFirst({
      where: {
        id: challengeId,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { include: { roles: true } } },
    });
  }

  findLatestActiveByTarget(target: string, purpose: OtpPurpose) {
    return this.prisma.otpChallenge.findFirst({
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

  findLatestActiveByUserId(userId: string, purpose: OtpPurpose) {
    return this.prisma.otpChallenge.findFirst({
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

  incrementAttemptCount(challengeId: string) {
    return this.prisma.otpChallenge.update({
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

  invalidate(challengeId: string) {
    return this.prisma.otpChallenge.update({
      where: { id: challengeId },
      data: { invalidatedAt: new Date() },
    });
  }

  listRecentChallengesForTarget(
    target: string,
    purpose: OtpPurpose,
    since: Date,
  ) {
    return this.prisma.otpChallenge.findMany({
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
