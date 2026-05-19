import { Injectable } from '@nestjs/common';
import { Prisma, RefundPolicyType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

const policyInclude = {
  clauses: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
} satisfies Prisma.RefundPolicyInclude;

@Injectable()
export class RefundPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  listPolicies(tx?: Prisma.TransactionClient) {
    return this.getDb(tx).refundPolicy.findMany({
      orderBy: [{ policyType: 'asc' }],
      include: policyInclude,
    });
  }

  findPolicyByType(
    policyType: RefundPolicyType,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).refundPolicy.findUnique({
      where: { policyType },
      include: policyInclude,
    });
  }

  findPolicyById(policyId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).refundPolicy.findUnique({
      where: { id: policyId },
      include: policyInclude,
    });
  }

  upsertPolicy(
    data: Prisma.RefundPolicyUncheckedCreateInput &
      Prisma.RefundPolicyUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).refundPolicy.upsert({
      where: { policyType: data.policyType as RefundPolicyType },
      create: data as Prisma.RefundPolicyUncheckedCreateInput,
      update: data as Prisma.RefundPolicyUncheckedUpdateInput,
      include: policyInclude,
    });
  }

  updatePolicy(
    policyId: string,
    data: Prisma.RefundPolicyUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).refundPolicy.update({
      where: { id: policyId },
      data,
      include: policyInclude,
    });
  }

  createClause(
    data: Prisma.RefundPolicyClauseUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).refundPolicyClause.create({
      data,
    });
  }

  findClauseById(clauseId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).refundPolicyClause.findUnique({
      where: { id: clauseId },
      include: {
        policy: {
          include: policyInclude,
        },
      },
    });
  }

  updateClause(
    clauseId: string,
    data: Prisma.RefundPolicyClauseUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).refundPolicyClause.update({
      where: { id: clauseId },
      data,
    });
  }

  deleteClause(clauseId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).refundPolicyClause.delete({
      where: { id: clauseId },
    });
  }

  async reorderClauses(
    policyId: string,
    items: Array<{ id: string; sortOrder: number }>,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.getDb(tx);
    await Promise.all(
      items.map((item) =>
        db.refundPolicyClause.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
    return this.findPolicyById(policyId, tx);
  }
}
