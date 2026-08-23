import { Injectable } from '@nestjs/common';
import { MarketType, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CommissionRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  createRule(data: Prisma.CommissionRuleUncheckedCreateInput) {
    return this.prisma.commissionRule.create({ data });
  }

  findBySlug(slug: string, db: DbClient = this.prisma) {
    return db.commissionRule.findUnique({ where: { slug } });
  }

  listRules(where: Prisma.CommissionRuleWhereInput) {
    return this.prisma.commissionRule.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { isDefault: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  listActiveRules(at: Date) {
    return this.prisma.commissionRule.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: at } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: at } }] }],
      },
      orderBy: [
        { priority: 'desc' },
        { isDefault: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  upsertRuleBySlug(input: {
    slug: string;
    create: Prisma.CommissionRuleUncheckedCreateInput;
    update: Prisma.CommissionRuleUncheckedUpdateInput;
  }) {
    return this.prisma.commissionRule.upsert({
      where: { slug: input.slug },
      create: input.create,
      update: input.update,
    });
  }

  updateById(
    id: string,
    data: Prisma.CommissionRuleUncheckedUpdateInput,
    db: DbClient = this.prisma,
  ) {
    return db.commissionRule.update({ where: { id }, data });
  }

  unsetOtherGlobalDefaults(
    input: {
    marketType: MarketType;
    keepSlug: string;
    },
    db: DbClient = this.prisma,
  ) {
    return db.commissionRule.updateMany({
      where: {
        marketType: input.marketType,
        ruleScope: 'GLOBAL',
        isDefault: true,
        slug: {
          not: input.keepSlug,
        },
      },
      data: {
        isDefault: false,
      },
    });
  }
}
