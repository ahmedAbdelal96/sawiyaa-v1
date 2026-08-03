import { BadRequestException } from '@nestjs/common';
import { CONFIG_KEYS } from '@modules/config/registry/config-key.constants';
import { ConfigRuntimeService } from '@modules/config/services/config-runtime.service';
import { ConfigurationManagementService } from '@modules/config/services/configuration-management.service';
import { UpdateConfigurationCommand } from '@modules/config/types/configuration-write.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { PackagePlanAdminService } from './package-plan-admin.service';

describe('PackagePlanAdminService', () => {
  const configState = {
    'packages.enabled': true,
    'packages.purchaseEnabled': false,
  } as Record<string, boolean>;
  const packagePlanFindUniqueMock = jest.fn();
  const packagePlanUpdateMock = jest.fn();
  const configurationUpdateManyMock = jest.fn(
    (commands: readonly UpdateConfigurationCommand[]) => {
      for (const item of commands) {
        configState[item.key] = item.value as boolean;
      }
      return Promise.resolve([]);
    },
  );

  const prisma = {
    packagePlan: {
      findUnique: packagePlanFindUniqueMock,
      update: packagePlanUpdateMock,
    },
  } as unknown as PrismaService;

  const configurationManagementService = {
    getCurrentVersion: jest.fn().mockResolvedValue({
      valueId: 'current-value',
      updatedAt: new Date('2026-08-02T12:00:00.000Z'),
    }),
    updateMany: configurationUpdateManyMock,
  } as unknown as ConfigurationManagementService;
  const configRuntimeService = {
    getBoolean: jest.fn((key: string) =>
      Promise.resolve(configState[key] ?? null),
    ),
  } as unknown as ConfigRuntimeService;

  const service = new PackagePlanAdminService(
    prisma,
    configurationManagementService,
    configRuntimeService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    configState['packages.enabled'] = true;
    configState['packages.purchaseEnabled'] = false;
    (
      configurationManagementService.getCurrentVersion as jest.Mock
    ).mockResolvedValue({
      valueId: 'current-value',
      updatedAt: new Date('2026-08-02T12:00:00.000Z'),
    });
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

    expect(packagePlanUpdateMock).toHaveBeenCalledWith({
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

    expect(packagePlanUpdateMock).toHaveBeenCalledWith(
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

  it('maps both package settings to one canonical atomic batch', async () => {
    const settings = await service.updateSettings({
      packagesEnabled: false,
      packagesPurchaseEnabled: true,
      changedByUserId: 'admin-1',
    });

    expect(configurationUpdateManyMock).toHaveBeenCalledTimes(1);
    const [commands] = configurationUpdateManyMock.mock.calls[0] as [
      UpdateConfigurationCommand[],
    ];
    expect(commands).toHaveLength(2);
    expect(commands.map((item) => item.key)).toEqual([
      CONFIG_KEYS.packages.enabled,
      CONFIG_KEYS.packages.purchaseEnabled,
    ]);
    expect(commands.every((item) => item.scopeRefId === null)).toBe(true);
    expect(commands.every((item) => item.scopeType === 'GLOBAL')).toBe(true);
    expect(commands.every((item) => item.actor.id === 'admin-1')).toBe(true);
    expect(settings).toEqual({
      packagesEnabled: false,
      packagesPurchaseEnabled: true,
    });
  });

  it('reads package settings', async () => {
    await expect(service.getSettings()).resolves.toEqual({
      packagesEnabled: true,
      packagesPurchaseEnabled: false,
    });
  });

  it('preserves the existing same-value versioning behavior', async () => {
    await service.updateSettings({
      packagesEnabled: true,
      changedByUserId: 'admin-1',
    });

    expect(configurationUpdateManyMock).toHaveBeenCalledTimes(1);
    const calls = configurationUpdateManyMock.mock.calls as unknown as [
      readonly UpdateConfigurationCommand[],
    ][];
    expect(calls[0][0]).toHaveLength(1);
  });

  it('rejects a stale package version before any batch write', async () => {
    (
      configurationManagementService.getCurrentVersion as jest.Mock
    ).mockRejectedValue(new Error('CONFIG_WRITE_CONFLICT'));

    await expect(
      service.updateSettings({
        packagesEnabled: false,
        changedByUserId: 'admin-1',
      }),
    ).rejects.toThrow('CONFIG_WRITE_CONFLICT');
    expect(configurationUpdateManyMock).not.toHaveBeenCalled();
  });

  it('rejects empty package settings updates', async () => {
    await expect(service.updateSettings({})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
