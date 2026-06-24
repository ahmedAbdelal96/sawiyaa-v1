import { PackagePlanRepository } from './package-plan.repository';

describe('PackagePlanRepository', () => {
  const packagePlan = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  };

  const prisma = {
    packagePlan,
  } as never;

  const repository = new PackagePlanRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists all plans ordered for admin display', async () => {
    packagePlan.findMany.mockResolvedValue([]);

    await repository.listAll();

    expect(packagePlan.findMany).toHaveBeenCalledWith({
      orderBy: [{ sortOrder: 'asc' }, { sessionCount: 'asc' }],
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });
  });

  it('finds a plan by code', async () => {
    packagePlan.findUnique.mockResolvedValue(null);

    await repository.findByCode('SESSIONS_4');

    expect(packagePlan.findUnique).toHaveBeenCalledWith({
      where: { code: 'SESSIONS_4' },
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });
  });

  it('lists active plans for public previews', async () => {
    packagePlan.findMany.mockResolvedValue([]);

    await repository.listActive();

    expect(packagePlan.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        archivedAt: null,
      },
      orderBy: [{ sortOrder: 'asc' }, { sessionCount: 'asc' }],
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });
  });

  it('finds an active plan by code', async () => {
    packagePlan.findFirst.mockResolvedValue(null);

    await repository.findActiveByCode('SESSIONS_4');

    expect(packagePlan.findFirst).toHaveBeenCalledWith({
      where: {
        code: 'SESSIONS_4',
        isActive: true,
        archivedAt: null,
      },
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });
  });

  it('updates a plan by code and returns counts', async () => {
    packagePlan.update.mockResolvedValue(null);

    await repository.updateByCode('SESSIONS_4', {
      title: 'Updated',
    });

    expect(packagePlan.update).toHaveBeenCalledWith({
      where: { code: 'SESSIONS_4' },
      data: {
        title: 'Updated',
      },
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });
  });
});
