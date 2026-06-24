import { NotFoundException } from '@nestjs/common';
import { GetPackagePlanUseCase } from './get-package-plan.use-case';

describe('GetPackagePlanUseCase', () => {
  it('returns a plan when found', async () => {
    const packagePlanRepository = {
      findByCode: jest.fn().mockResolvedValue({
        id: 'plan-1',
        code: 'SESSIONS_4',
        title: '4 Session Bundle',
        description: 'Four sessions with a 10% discount.',
        sessionCount: 4,
        discountPercent: { toString: () => '10' },
        isActive: true,
        sortOrder: 1,
        archivedAt: null,
        metadataJson: { tier: 'SESSIONS_4' },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        _count: { purchases: 0 },
      }),
    } as never;
    const packagePlanPresenter = {
      toViewModel: jest.fn((item: Record<string, unknown>) => ({
        id: item.id,
      })),
    } as never;

    const useCase = new GetPackagePlanUseCase(
      packagePlanRepository,
      packagePlanPresenter,
    );

    const result = await useCase.execute({ code: 'SESSIONS_4' });

    expect(packagePlanRepository.findByCode).toHaveBeenCalledWith('SESSIONS_4');
    expect(result.item).toEqual({ id: 'plan-1' });
  });

  it('throws when the plan does not exist', async () => {
    const packagePlanRepository = {
      findByCode: jest.fn().mockResolvedValue(null),
    } as never;
    const packagePlanPresenter = {
      toViewModel: jest.fn(),
    } as never;

    const useCase = new GetPackagePlanUseCase(
      packagePlanRepository,
      packagePlanPresenter,
    );

    await expect(useCase.execute({ code: 'MISSING' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
