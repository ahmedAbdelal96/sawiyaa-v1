import {
  deactivateLegacyProductionFinancialRules,
  ensureProductionFinancialRules,
  PRODUCTION_FINANCIAL_RULES,
} from './financial-rules.seed';

type FakePrisma = {
  commissionRule: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
};

function createFakePrisma(existingSlugs: string[] = []): FakePrisma {
  const slugs = new Set(existingSlugs);
  return {
    commissionRule: {
      findUnique: jest.fn(async ({ where }: { where: { slug: string } }) =>
        slugs.has(where.slug)
          ? { id: `existing-${where.slug}`, isActive: true }
          : null,
      ),
      create: jest.fn(async ({ data }: { data: { slug: string } }) => {
        slugs.add(data.slug);
        return { id: `created-${data.slug}` };
      }),
      update: jest.fn(async () => ({ id: 'updated' })),
      updateMany: jest.fn(async () => ({ count: 4 })),
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

  it('deactivates only the legacy seeded defaults', async () => {
    const prisma = createFakePrisma();

    await expect(deactivateLegacyProductionFinancialRules(prisma)).resolves.toBe(4);
    expect(prisma.commissionRule.updateMany).toHaveBeenCalledWith({
      where: {
        slug: {
          in: [
            'session-booking-local-default',
            'session-booking-cross-border-default',
            'session-booking-any-fallback',
            'session-booking-instant-default',
          ],
        },
        isDefault: true,
      },
      data: { isActive: false },
    });
  });
});
