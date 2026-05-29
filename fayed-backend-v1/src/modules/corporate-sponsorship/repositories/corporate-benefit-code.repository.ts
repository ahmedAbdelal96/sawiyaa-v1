import { Injectable } from '@nestjs/common';
import { Prisma, CorporateCodeStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CorporateBenefitCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  /**
   * Find a code by its hash.
   */
  async findByHash(codeHash: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateBenefitCode.findUnique({
      where: { codeHash },
      include: {
        batch: {
          select: { id: true, name: true },
        },
        benefitPlan: {
          include: {
            contract: {
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    companyCode: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find a code by its ID.
   */
  async findById(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateBenefitCode.findUnique({
      where: { id },
      include: {
        batch: {
          select: { id: true, name: true },
        },
        benefitPlan: {
          include: {
            contract: {
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    companyCode: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Atomically reserve an AVAILABLE code.
   * Returns the updated code or null if the reservation failed (code was not available).
   */
  async reserveCode(
    data: {
      codeHash: string;
      reservedByUserId: string;
      reservedSessionId: string;
      reservedUntil: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const now = new Date();
    return this.getDb(tx).corporateBenefitCode.updateMany({
      where: {
        codeHash: data.codeHash,
        status: CorporateCodeStatus.AVAILABLE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      data: {
        status: CorporateCodeStatus.RESERVED,
        reservedByUserId: data.reservedByUserId,
        reservedSessionId: data.reservedSessionId,
        reservedUntil: data.reservedUntil,
      },
    });
  }

  /**
   * Atomically reclaim an already-RESERVED code whose reservation has expired.
   * Only reclaims if reservedUntil <= now.
   */
  async reclaimExpiredCode(
    data: {
      codeHash: string;
      reservedByUserId: string;
      reservedSessionId: string;
      reservedUntil: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const now = new Date();
    return this.getDb(tx).corporateBenefitCode.updateMany({
      where: {
        codeHash: data.codeHash,
        status: CorporateCodeStatus.RESERVED,
        reservedUntil: { lte: now },
      },
      data: {
        status: CorporateCodeStatus.RESERVED,
        reservedByUserId: data.reservedByUserId,
        reservedSessionId: data.reservedSessionId,
        reservedUntil: data.reservedUntil,
      },
    });
  }

  /**
   * Release a RESERVED code back to AVAILABLE.
   * Only releases if the code is RESERVED and the reservation belongs to the given session/patient.
   */
  async releaseCode(
    data: {
      codeHash: string;
      sessionId: string;
      userId: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateBenefitCode.updateMany({
      where: {
        codeHash: data.codeHash,
        status: CorporateCodeStatus.RESERVED,
        reservedSessionId: data.sessionId,
        reservedByUserId: data.userId,
      },
      data: {
        status: CorporateCodeStatus.AVAILABLE,
        reservedByUserId: null,
        reservedSessionId: null,
        reservedUntil: null,
      },
    });
  }

  /**
   * Count codes by status for a given code hash (grouped by batch).
   */
  async countByBatchAndStatus(
    batchId: string,
    status: CorporateCodeStatus,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateBenefitCode.count({
      where: { batchId, status },
    });
  }

  /**
   * Mark a code as USED for a specific session.
   * Uses conditional update to ensure idempotency - only updates if status is RESERVED and session matches.
   * Returns the count of updated rows (0 or 1).
   */
  async markUsedForSession(
    codeId: string,
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const result = await this.getDb(tx).corporateBenefitCode.updateMany({
      where: {
        id: codeId,
        status: CorporateCodeStatus.RESERVED,
        reservedSessionId: sessionId,
      },
      data: {
        status: CorporateCodeStatus.USED,
        usedSessionId: sessionId,
        usedAt: new Date(),
      },
    });
    return result.count;
  }
}
