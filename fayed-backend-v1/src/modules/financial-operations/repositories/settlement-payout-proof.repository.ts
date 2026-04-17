import { Injectable } from '@nestjs/common';
import { Prisma, PractitionerSettlementPayoutProof } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SettlementPayoutProofRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findByPayoutId(payoutId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerSettlementPayoutProof.findUnique({
      where: { payoutId },
      include: {
        payout: {
          select: {
            id: true,
            practitionerId: true,
          },
        },
      },
    });
  }

  upsertProof(
    input: {
      payoutId: string;
      storedFileName: string;
      storagePath: string;
      mimeType: string;
      fileSizeBytes: number;
      originalFileName?: string | null;
      uploadedAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<PractitionerSettlementPayoutProof> {
    return this.getDb(tx).practitionerSettlementPayoutProof.upsert({
      where: {
        payoutId: input.payoutId,
      },
      create: {
        payoutId: input.payoutId,
        storedFileName: input.storedFileName,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        originalFileName: input.originalFileName ?? null,
        uploadedAt: input.uploadedAt,
      },
      update: {
        storedFileName: input.storedFileName,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        originalFileName: input.originalFileName ?? null,
        uploadedAt: input.uploadedAt,
      },
    });
  }

  deleteByPayoutId(payoutId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerSettlementPayoutProof.deleteMany({
      where: { payoutId },
    });
  }
}
