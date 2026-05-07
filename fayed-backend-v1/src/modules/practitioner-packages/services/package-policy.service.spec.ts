import { ConfigChangeAction, ConfigScopeType } from '@prisma/client';
import { ConfigResolverService } from '@modules/config/services/config-resolver.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { PackagePolicyService } from './package-policy.service';

describe('PackagePolicyService', () => {
  const configResolverService = {
    getNumber: jest.fn(),
  } as unknown as ConfigResolverService;

  const tx = {
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
  };

  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  } as unknown as PrismaService;

  const service = new PackagePolicyService(
    prisma,
    configResolverService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves global and practitioner-scoped package limits without hardcoded fallback', async () => {
    (configResolverService.getNumber as jest.Mock)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(6);

    const result = await service.resolve({ practitionerId: 'practitioner-1' });

    expect(result.globalMaxNonArchivedPackages).toBe(4);
    expect(result.effectiveMaxNonArchivedPackages).toBe(6);
    expect(configResolverService.getNumber).toHaveBeenCalledTimes(2);
  });

  it('writes practitioner-scoped overrides through the config engine', async () => {
    tx.configKeyCatalog.findUnique = jest.fn().mockResolvedValue({
      id: 'config-key-1',
      key: 'packages.practitioner.maxNonArchivedPackages',
    });
    tx.configValue.findFirst = jest.fn().mockResolvedValue({
      id: 'config-value-old',
      scopeType: ConfigScopeType.PRACTITIONER,
      scopeRefId: 'practitioner-1',
      valueNumber: 4,
      priority: 100,
      isActive: true,
    });
    tx.configValue.update = jest.fn().mockResolvedValue({});
    tx.configValue.create = jest.fn().mockResolvedValue({
      id: 'config-value-new',
      scopeType: ConfigScopeType.PRACTITIONER,
      scopeRefId: 'practitioner-1',
      valueNumber: 6,
      isActive: true,
    });
    tx.configChangeLog.create = jest.fn().mockResolvedValue({});

    await service.update({
      maxNonArchivedPackages: 6,
      practitionerId: 'practitioner-1',
      changedByUserId: 'admin-1',
    });

    expect(tx.configValue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'config-value-old' },
        data: expect.objectContaining({
          isActive: false,
        }),
      }),
    );
    expect(tx.configValue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scopeType: ConfigScopeType.PRACTITIONER,
          scopeRefId: 'practitioner-1',
        }),
      }),
    );
    expect(tx.configChangeLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          changeAction: ConfigChangeAction.UPDATED,
        }),
      }),
    );
  });
});
