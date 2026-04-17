import { Injectable } from '@nestjs/common';
import {
  CredentialReviewStatus,
  CredentialType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Credential repository stores and reads practitioner credential metadata only.
 * File storage or moderation workflows are intentionally out of scope in this baseline.
 */
@Injectable()
export class PractitionerCredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  create(
    data: {
      practitionerId: string;
      credentialType: CredentialType;
      fileUrl: string;
      expiresAt?: Date | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerCredential.create({
      data,
    });
  }

  findExistingByTypeAndFileUrl(
    input: {
      practitionerId: string;
      credentialType: CredentialType;
      fileUrl: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerCredential.findFirst({
      where: {
        practitionerId: input.practitionerId,
        credentialType: input.credentialType,
        fileUrl: input.fileUrl,
      },
      select: {
        id: true,
      },
    });
  }

  listByPractitionerId(practitionerId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerCredential.findMany({
      where: { practitionerId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async getSummary(
    practitionerId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    totalCredentials: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    expiredCount: number;
    lastUploadedAt: Date | null;
  }> {
    const db = this.getDb(tx);

    const [
      totalCredentials,
      pendingCount,
      approvedCount,
      rejectedCount,
      expiredCount,
      lastCredential,
    ] = await Promise.all([
      db.practitionerCredential.count({
        where: { practitionerId },
      }),
      db.practitionerCredential.count({
        where: {
          practitionerId,
          reviewStatus: CredentialReviewStatus.PENDING,
        },
      }),
      db.practitionerCredential.count({
        where: {
          practitionerId,
          reviewStatus: CredentialReviewStatus.APPROVED,
        },
      }),
      db.practitionerCredential.count({
        where: {
          practitionerId,
          reviewStatus: CredentialReviewStatus.REJECTED,
        },
      }),
      db.practitionerCredential.count({
        where: {
          practitionerId,
          reviewStatus: CredentialReviewStatus.EXPIRED,
        },
      }),
      db.practitionerCredential.findFirst({
        where: { practitionerId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      totalCredentials,
      pendingCount,
      approvedCount,
      rejectedCount,
      expiredCount,
      lastUploadedAt: lastCredential?.createdAt ?? null,
    };
  }
}
