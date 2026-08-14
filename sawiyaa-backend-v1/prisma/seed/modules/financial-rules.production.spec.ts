import { ensureProductionFinancialRules, PRODUCTION_FINANCIAL_RULES } from './financial-rules.seed';

type FakePrisma = {
  commissionRule: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

function createFakePrisma(existingSlugs: string[] = []): FakePrisma {
  const slugs = new Set(existingSlugs);
  return {
    commissionRule: {
      findUnique: jest.fn(async ({ where }: { where: { slug: string } }) =>
        slugs.has(where.slug) ? { id: `existing-${where.slug}` } : null,
      ),
      create: jest.fn(async ({ data }: { data: { slug: string } }) => {
        slugs.add(data.slug);
        return { id: `created-${data.slug}` };
      }),
    },
  };
}

describe('production financial baseline', () => {
  it('creates the canonical missing rules and nothing else', async () => {
    const prisma = createFakePrisma();
    const summary = await ensureProductionFinancialRules(prisma);

    expect(summary).toEqual({ created: PRODUCTION_FINANCIAL_RULES.length, preserved: 0 });
    expect(prisma.commissionRule.create).toHaveBeenCalledTimes(PRODUCTION_FINANCIAL_RULES.length);
    expect(prisma.commissionRule.create.mock.calls.map(([call]) => call.data.slug)).toEqual(
      PRODUCTION_FINANCIAL_RULES.map((rule) => rule.slug),
    );
  });

  it('is idempotent and preserves every existing rule', async () => {
    const prisma = createFakePrisma(PRODUCTION_FINANCIAL_RULES.map((rule) => rule.slug));
    const summary = await ensureProductionFinancialRules(prisma);

    expect(summary).toEqual({ created: 0, preserved: PRODUCTION_FINANCIAL_RULES.length });
    expect(prisma.commissionRule.create).not.toHaveBeenCalled();
  });
});
