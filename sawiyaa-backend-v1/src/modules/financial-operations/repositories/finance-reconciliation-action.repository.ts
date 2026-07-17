import { Injectable } from '@nestjs/common';
import { FinanceReconciliationAction, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class FinanceReconciliationActionRepository {
  constructor(private readonly prisma: PrismaService) {}

  append(
    data: Prisma.FinanceReconciliationActionUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).financeReconciliationAction.create({ data });
  }

  listByIssueId(
    issueId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<FinanceReconciliationAction[]> {
    return (tx ?? this.prisma).financeReconciliationAction.findMany({
      where: { issueId },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
  }
}
