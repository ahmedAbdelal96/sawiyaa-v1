import { Prisma } from '@prisma/client';
import { CommissionRuleRepository } from '../repositories/commission-rule.repository';
import { MoneyMathService } from '../services/money-math.service';
import { ValidateCommissionRuleDefinitionService } from '../services/validate-commission-rule-definition.service';
import { GetRevenueShareRulesUseCase } from './get-revenue-share-rules.use-case';

describe('GetRevenueShareRulesUseCase', () => {
  const repository = {
    findBySlug: jest.fn(),
    createRule: jest.fn(),
  } as unknown as CommissionRuleRepository;
  const moneyMathService = new MoneyMathService();
  const useCase = new GetRevenueShareRulesUseCase(
    repository,
    new ValidateCommissionRuleDefinitionService(moneyMathService),
  );

  beforeEach(() => jest.clearAllMocks());

  it('preserves existing Admin overrides on read', async () => {
    const existingLocal = {
      id: 'local-id',
      slug: 'revenue-share-default-local',
      platformRatePercent: new Prisma.Decimal('25.00'),
      practitionerRatePercent: new Prisma.Decimal('75.00'),
      isActive: true,
      updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    };
    const existingCrossBorder = {
      ...existingLocal,
      id: 'cross-border-id',
      slug: 'revenue-share-default-cross-border',
      platformRatePercent: new Prisma.Decimal('40.00'),
      practitionerRatePercent: new Prisma.Decimal('60.00'),
    };
    (repository.findBySlug as jest.Mock)
      .mockResolvedValueOnce(existingLocal)
      .mockResolvedValueOnce(existingCrossBorder);

    const result = await useCase.execute();

    expect(result.item.configurationState).toBe('REQUIRES_UNIFICATION');
    expect(result.item.platformCommissionPercent).toBeNull();
    expect(repository.createRule).not.toHaveBeenCalled();
  });

  it('returns one exact derived split when market defaults are unified', async () => {
    const existing = {
      id: 'rule-id',
      slug: 'revenue-share-default-local',
      platformRatePercent: new Prisma.Decimal('30.00'),
      practitionerRatePercent: new Prisma.Decimal('70.00'),
      isActive: true,
      updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    };
    (repository.findBySlug as jest.Mock)
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce({
        ...existing,
        slug: 'revenue-share-default-cross-border',
      });

    const result = await useCase.execute();

    expect(result.item).toMatchObject({
      configurationState: 'READY',
      platformCommissionPercent: '30.00',
      practitionerSharePercent: '70.00',
    });
  });

  it('fails closed when a mandatory rule is missing and performs no write', async () => {
    (repository.findBySlug as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    await expect(useCase.execute()).rejects.toMatchObject({
      response: { error: 'FINANCIAL_RULE_COMMISSION_RULE_NOT_FOUND' },
    });
    expect(repository.createRule).not.toHaveBeenCalled();
  });

  it('fails closed when a mandatory rule is inactive', async () => {
    (repository.findBySlug as jest.Mock)
      .mockResolvedValueOnce({ isActive: false })
      .mockResolvedValueOnce({ isActive: true });

    await expect(useCase.execute()).rejects.toMatchObject({
      response: { error: 'FINANCIAL_RULE_COMMISSION_RULE_NOT_FOUND' },
    });
    expect(repository.createRule).not.toHaveBeenCalled();
  });
});
