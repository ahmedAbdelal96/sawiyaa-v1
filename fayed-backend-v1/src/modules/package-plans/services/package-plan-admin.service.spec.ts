import { BadRequestException } from '@nestjs/common';
import { PackagePlanAdminService } from './package-plan-admin.service';

describe('PackagePlanAdminService', () => {
  const configState = {
    'packages.enabled': true,
    'packages.purchaseEnabled': false,
  } as Record<string, boolean>;

  const prisma = {
    packagePlan: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    configKeyCatalog: {
      findUnique: jest.fn(),
    },
    configValue: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    configChangeLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb(prisma as never),
    ),
  } as never;

  const service = new PackagePlanAdminService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    configState['packages.enabled'] = true;
    configState['packages.purchaseEnabled'] = false;
  });

  it('updates only safe package plan fields', async () => {
    (prisma.packagePlan.findUnique as jest.Mock).mockResolvedValue({
      code: 'SESSIONS_4',
    });
    (prisma.packagePlan.update as jest.Mock).mockResolvedValue({
      id: 'plan-1',
      code: 'SESSIONS_4',
      title: 'Updated title',
      description: 'Updated description',
      sessionCount: 4,
      discountPercent: { toString: () => '10.00' },
      isActive: false,
      sortOrder: 5,
      archivedAt: null,
      metadataJson: {},
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      _count: { purchases: 0 },
    });

    const result = await service.updatePlan({
      code: 'SESSIONS_4',
      title: 'Updated title',
      description: 'Updated description',
      sortOrder: 5,
      isActive: false,
      changedByUserId: 'admin-1',
    });

    expect(prisma.packagePlan.update).toHaveBeenCalledWith({
      where: { code: 'SESSIONS_4' },
      data: {
        title: 'Updated title',
        description: 'Updated description',
        sortOrder: 5,
        isActive: false,
      },
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });
    expect(result.code).toBe('SESSIONS_4');
  });

  it('can re-enable a disabled plan', async () => {
    (prisma.packagePlan.findUnique as jest.Mock).mockResolvedValue({
      code: 'SESSIONS_4',
    });
    (prisma.packagePlan.update as jest.Mock).mockResolvedValue({
      id: 'plan-1',
      code: 'SESSIONS_4',
      title: 'Updated title',
      description: 'Updated description',
      sessionCount: 4,
      discountPercent: { toString: () => '10.00' },
      isActive: true,
      sortOrder: 5,
      archivedAt: null,
      metadataJson: {},
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      _count: { purchases: 0 },
    });

    await service.updatePlan({
      code: 'SESSIONS_4',
      isActive: true,
    });

    expect(prisma.packagePlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          isActive: true,
        },
      }),
    );
  });

  it('rejects non-standard package plan codes', async () => {
    await expect(
      service.updatePlan({
        code: 'CUSTOM_PLAN',
        title: 'Nope',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects empty package plan updates', async () => {
    (prisma.packagePlan.findUnique as jest.Mock).mockResolvedValue({
      code: 'SESSIONS_4',
    });

    await expect(
      service.updatePlan({
        code: 'SESSIONS_4',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolves package settings and updates them transactionally', async () => {
    (prisma.configKeyCatalog.findUnique as jest.Mock).mockImplementation(
      async ({ where }: { where: { key: string } }) => ({ id: where.key }),
    );
    (prisma.configValue.findFirst as jest.Mock).mockImplementation(
      async ({ where }: { where: { configKeyId: string } }) => ({
        id: `${where.configKeyId}-current`,
        scopeType: 'GLOBAL',
        scopeRefId: null,
        valueBoolean: configState[where.configKeyId],
        isActive: true,
        priority: 100,
      }),
    );
    (prisma.configValue.update as jest.Mock).mockImplementation(
      async ({ where, data }: { where: { id: string }; data: { isActive: boolean } }) => {
        void where;
        void data;
        return {};
      },
    );
    (prisma.configValue.create as jest.Mock).mockImplementation(
      async ({ data }: { data: { configKeyId: string; valueBoolean: boolean } }) => {
        configState[data.configKeyId] = data.valueBoolean;
        return {
          id: `${data.configKeyId}-new`,
          valueBoolean: data.valueBoolean,
          isActive: true,
        };
      },
    );
    (prisma.configChangeLog.create as jest.Mock).mockResolvedValue({});

    const settings = await service.updateSettings({
      packagesEnabled: false,
      packagesPurchaseEnabled: true,
      changedByUserId: 'admin-1',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(settings).toEqual({
      packagesEnabled: false,
      packagesPurchaseEnabled: true,
    });
  });

  it('reads package settings', async () => {
    (prisma.configKeyCatalog.findUnique as jest.Mock).mockImplementation(
      async ({ where }: { where: { key: string } }) => ({ id: where.key }),
    );
    (prisma.configValue.findFirst as jest.Mock).mockImplementation(
      async ({ where }: { where: { configKeyId: string } }) => ({
        valueBoolean: configState[where.configKeyId],
      }),
    );

    await expect(service.getSettings()).resolves.toEqual({
      packagesEnabled: true,
      packagesPurchaseEnabled: false,
    });
  });

  it('rejects empty package settings updates', async () => {
    await expect(service.updateSettings({})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
