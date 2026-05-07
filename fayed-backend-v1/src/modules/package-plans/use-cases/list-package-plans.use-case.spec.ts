import { ListPackagePlansUseCase } from './list-package-plans.use-case';

describe('ListPackagePlansUseCase', () => {
  it('maps repository results into view models', async () => {
    const packagePlanRepository = {
      listAll: jest.fn().mockResolvedValue([
        {
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
        },
      ]),
    } as never;
    const packagePlanPresenter = {
      toViewModel: jest.fn((item: Record<string, unknown>) => ({
        id: item.id,
      })),
    } as never;

    const useCase = new ListPackagePlansUseCase(
      packagePlanRepository,
      packagePlanPresenter,
    );

    const result = await useCase.execute();

    expect(packagePlanRepository.listAll).toHaveBeenCalledTimes(1);
    expect(packagePlanPresenter.toViewModel).toHaveBeenCalledTimes(1);
    expect(result.items).toEqual([{ id: 'plan-1' }]);
  });
});
