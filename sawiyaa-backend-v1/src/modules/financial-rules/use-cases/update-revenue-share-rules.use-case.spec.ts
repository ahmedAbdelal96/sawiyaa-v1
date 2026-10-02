import { Prisma } from '@prisma/client';
import { AppRole } from '@common/enums/app-role.enum';
import { CommissionRuleRepository } from '../repositories/commission-rule.repository';
import { MoneyMathService } from '../services/money-math.service';
import { ValidateCommissionRuleDefinitionService } from '../services/validate-commission-rule-definition.service';
import { UpdateRevenueShareRulesUseCase } from './update-revenue-share-rules.use-case';

describe('UpdateRevenueShareRulesUseCase', () => {
  const tx = {} as never;
  const localUpdatedAt = new Date('2026-08-22T07:00:00.000Z');
  const crossBorderUpdatedAt = new Date('2026-08-22T07:00:01.000Z');
  const local = {
    id: 'local-id',
    slug: 'revenue-share-default-local',
    platformRatePercent: new Prisma.Decimal('30.00'),
    practitionerRatePercent: new Prisma.Decimal('70.00'),
    isActive: true,
    updatedAt: localUpdatedAt,
  };
  const crossBorder = {
    id: 'cross-border-id',
    slug: 'revenue-share-default-cross-border',
    platformRatePercent: new Prisma.Decimal('50.00'),
    practitionerRatePercent: new Prisma.Decimal('50.00'),
    isActive: true,
    updatedAt: crossBorderUpdatedAt,
  };

  const repository = {
    findBySlug: jest.fn(),
    updateById: jest.fn(),
    unsetOtherGlobalDefaults: jest.fn(),
  } as unknown as CommissionRuleRepository;
  const prisma = {
    $transaction: jest.fn(async (callback: (client: never) => unknown) =>
      callback(tx),
    ),
  } as never;
  const audit = { recordRequired: jest.fn().mockResolvedValue(undefined) };
  const moneyMath = new MoneyMathService();
  const useCase = new UpdateRevenueShareRulesUseCase(
    prisma,
    repository,
    new ValidateCommissionRuleDefinitionService(moneyMath),
    moneyMath,
    audit as never,
  );
  const actor = { id: 'admin-id', roles: [AppRole.SUPER_ADMIN] };

  beforeEach(() => {
    jest.clearAllMocks();
    (repository.findBySlug as jest.Mock)
      .mockResolvedValueOnce(local)
      .mockResolvedValueOnce(crossBorder);
    (repository.updateById as jest.Mock)
      .mockResolvedValueOnce({ ...local, updatedAt: crossBorderUpdatedAt })
      .mockResolvedValueOnce({ ...crossBorder, updatedAt: crossBorderUpdatedAt });
    (repository.unsetOtherGlobalDefaults as jest.Mock).mockResolvedValue({ count: 0 });
  });

  it('derives the practitioner share and updates both market defaults atomically', async () => {
    const result = await useCase.execute(
      {
        platformCommissionPercent: '32.50',
        reason: 'Approved financial policy change',
        expectedUpdatedAt: `${localUpdatedAt.toISOString()}|${crossBorderUpdatedAt.toISOString()}`,
      },
      actor,
    );

    expect(repository.updateById).toHaveBeenNthCalledWith(
      1,
      'local-id',
      expect.objectContaining({ platformRatePercent: '32.50', practitionerRatePercent: '67.50' }),
      tx,
    );
    expect(repository.updateById).toHaveBeenNthCalledWith(
      2,
      'cross-border-id',
      expect.objectContaining({ platformRatePercent: '32.50', practitionerRatePercent: '67.50' }),
      tx,
    );
    expect(audit.recordRequired).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'financial.platformCommission.update.success',
        actorUserId: 'admin-id',
        reason: 'Approved financial policy change',
      }),
    );
    expect(result.item).toMatchObject({
      configurationState: 'READY',
      platformCommissionPercent: '32.50',
      practitionerSharePercent: '67.50',
    });
  });

  it('fails with a conflict before writing when the version is stale', async () => {
    await expect(
      useCase.execute(
        {
          platformCommissionPercent: '32.50',
          reason: 'Stale write',
          expectedUpdatedAt: 'stale-version',
        },
        actor,
      ),
    ).rejects.toMatchObject({
      response: { error: 'FINANCIAL_RULE_CONFIGURATION_CHANGED' },
    });
    expect(repository.updateById).not.toHaveBeenCalled();
    expect(audit.recordRequired).not.toHaveBeenCalled();
  });
});
