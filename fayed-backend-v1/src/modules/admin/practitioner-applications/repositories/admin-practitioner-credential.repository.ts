import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Admin credential repository exposes metadata needed for review decisions.
 * It keeps file-storage concerns out of this admin decision scope.
 */
@Injectable()
export class AdminPractitionerCredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  listByPractitionerId(practitionerId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerCredential.findMany({
      where: { practitionerId },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        credentialType: true,
        fileUrl: true,
        reviewStatus: true,
        reviewedAt: true,
        reviewedByUserId: true,
        reviewNotes: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }
}
