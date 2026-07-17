import { Injectable } from '@nestjs/common';
import { LedgerClassificationEvent, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class LedgerClassificationEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  append(
    data: Prisma.LedgerClassificationEventUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).ledgerClassificationEvent.create({ data });
  }

  listByLedgerEntryId(
    ledgerEntryId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<LedgerClassificationEvent[]> {
    return (tx ?? this.prisma).ledgerClassificationEvent.findMany({
      where: { ledgerEntryId },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
  }
}
