import { Injectable } from '@nestjs/common';
import { Prisma, RefundEvent } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { sanitizeFinanceAuditMetadata } from '@common/security-audit/sanitize-finance-audit-metadata.util';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class RefundEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  append(data: Prisma.RefundEventUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).refundEvent.create({
      data: {
        ...data,
        metadataJson: data.metadataJson === undefined
          ? undefined
          : (sanitizeFinanceAuditMetadata(data.metadataJson) as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
      },
    });
  }

  listByRefundId(refundId: string, tx?: Prisma.TransactionClient): Promise<RefundEvent[]> {
    return this.getDb(tx).refundEvent.findMany({
      where: { refundId },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
  }
}
