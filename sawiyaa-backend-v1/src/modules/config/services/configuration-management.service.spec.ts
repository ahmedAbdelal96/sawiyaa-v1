import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigDataType, ConfigScopeType } from '@prisma/client';
import { CONFIG_KEYS } from '../registry/config-key.constants';
import { ConfigDefinition } from '../registry/config-definition.types';
import { ConfigurationAuthorizationService } from './configuration-authorization.service';
import {
  ConfigurationManagementService,
  redactConfigurationValue,
} from './configuration-management.service';
import { UpdateConfigurationCommand } from '../types/configuration-write.types';

const actor = {
  type: 'USER' as const,
  id: '11111111-1111-4111-8111-111111111111',
  permissions: ['configuration.edit.operational'] as const,
};

function createTransaction(current: Record<string, unknown> | null = null) {
  const created = {
    id: 'value-2',
    updatedAt: new Date('2026-08-02T12:00:00.000Z'),
  };
  const changeLog = { id: 'change-1' };
  const tx = {
    configKeyCatalog: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'key-1',
        key: CONFIG_KEYS.packages.enabled,
        dataType: ConfigDataType.BOOLEAN,
        defaultValueJson: false,
      }),
    },
    configValue: {
      findFirst: jest.fn().mockResolvedValue(current),
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(created),
    },
    configChangeLog: {
      create: jest.fn().mockResolvedValue(changeLog),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  return { prisma, tx, created, changeLog };
}

function command(
  overrides: Partial<UpdateConfigurationCommand> = {},
): UpdateConfigurationCommand {
  return {
    key: CONFIG_KEYS.packages.enabled,
    value: true,
    scopeType: ConfigScopeType.GLOBAL,
    scopeRefId: null,
    actor,
    actorType: 'USER',
    reason: 'Enable package availability for local verification',
    ...overrides,
  } as UpdateConfigurationCommand;
}

function createService(
  current: Record<string, unknown> | null = null,
  authorization = new ConfigurationAuthorizationService(),
) {
  const transaction = createTransaction(current);
  const service = new ConfigurationManagementService(
    transaction.prisma as never,
    authorization,
  );
  return { service, ...transaction };
}

describe('ConfigurationManagementService', () => {
  it('creates a value and an auditable change atomically', async () => {
    const { service, tx, created, changeLog } = createService();

    await expect(service.update(command())).resolves.toMatchObject({
      key: CONFIG_KEYS.packages.enabled,
      value: true,
      valueId: created.id,
      changeLogId: changeLog.id,
    });

    const createCall = tx.configValue.create.mock.calls[0] as unknown as [
      { data: Record<string, unknown> },
    ];
    expect(createCall[0].data).toMatchObject({
      configKeyId: 'key-1',
      scopeType: ConfigScopeType.GLOBAL,
      scopeRefId: null,
      valueBoolean: true,
    });
    const changeCall = tx.configChangeLog.create.mock.calls[0] as unknown as [
      { data: Record<string, unknown> },
    ];
    expect(changeCall[0].data).toMatchObject({
      changedByUserId: actor.id,
      reason: 'Enable package availability for local verification',
    });
  });

  it('can require an absent value for atomic first-time initialization', async () => {
    const current = {
      id: 'value-1',
      updatedAt: new Date('2026-08-02T11:00:00.000Z'),
      priority: 100,
      scopeType: ConfigScopeType.GLOBAL,
      scopeRefId: null,
      valueBoolean: true,
      valueString: null,
      valueNumber: null,
      valueJson: null,
      effectiveFrom: new Date('2026-08-02T10:00:00.000Z'),
      effectiveTo: null,
      isActive: true,
    };
    const { service, tx } = createService(current);

    await expect(
      service.updateManyWithTransaction(
        [command({ expectedUpdatedAt: null })],
        (_tx, results) => results,
        { requireAbsent: true },
      ),
    ).rejects.toMatchObject({ response: { error: 'CONFIG_WRITE_CONFLICT' } });
    expect(tx.configValue.create).not.toHaveBeenCalled();
  });

  it('resets an override through the canonical write boundary and preserves history', async () => {
    const current = {
      id: 'value-1',
      updatedAt: new Date('2026-08-02T11:00:00.000Z'),
      priority: 100,
      scopeType: ConfigScopeType.GLOBAL,
      scopeRefId: null,
      valueBoolean: true,
      valueString: null,
      valueNumber: null,
      valueJson: null,
    };
    const { service, tx } = createService(current);

    await expect(
      service.reset({
        key: CONFIG_KEYS.packages.enabled,
        scopeType: ConfigScopeType.GLOBAL,
        scopeRefId: null,
        actor,
        actorType: 'USER',
        reason: 'Return package availability to the catalog default',
        expectedUpdatedAt: current.updatedAt,
      }),
    ).resolves.toMatchObject({
      key: CONFIG_KEYS.packages.enabled,
      valueId: current.id,
      changeLogId: 'change-1',
    });
    const updateCall = tx.configValue.update.mock.calls[0] as unknown as [
      { data: { isActive: boolean } },
    ];
    expect(updateCall[0].data.isActive).toBe(false);
    const logCall = tx.configChangeLog.create.mock.calls[0] as unknown as [
      { data: { changeAction: string } },
    ];
    expect(logCall[0].data.changeAction).toBe('OVERRIDE_REMOVED');
  });

  it('commits two valid commands through one atomic batch', async () => {
    const { service, prisma, tx } = createService();
    tx.configKeyCatalog.findUnique.mockImplementation(
      ({ where }: { where: { key: string } }) => ({
        id: where.key,
        key: where.key,
        dataType: 'BOOLEAN',
      }),
    );

    const results = await service.updateMany([
      command(),
      command({ key: CONFIG_KEYS.packages.purchaseEnabled, value: false }),
    ]);

    expect(results).toHaveLength(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.configValue.create).toHaveBeenCalledTimes(2);
    expect(tx.configChangeLog.create).toHaveBeenCalledTimes(2);
  });

  it('rejects duplicate keys before opening a transaction', async () => {
    const { service, prisma } = createService();

    await expect(
      service.updateMany([command(), command()]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('validates and authorizes the entire batch before any persistence', async () => {
    const { service, prisma } = createService();

    await expect(
      service.updateMany([
        command(),
        command({
          key: CONFIG_KEYS.auth.otp.loginTtlMinutes,
          value: 15,
        }),
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();

    await expect(
      service.updateMany([
        command(),
        command({
          key: CONFIG_KEYS.packages.purchaseEnabled,
          actor: { type: 'USER', id: actor.id, permissions: [] },
        }),
      ]),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an unknown key', async () => {
    const { service } = createService();
    const invalid = command({
      key: 'config.unknown' as UpdateConfigurationCommand['key'],
    });

    await expect(service.update(invalid)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects environment-owned keys', async () => {
    const { service } = createService();
    const envOwned = command({
      key: CONFIG_KEYS.auth.otp.loginTtlMinutes,
      value: 15,
    });

    await expect(service.update(envOwned)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects non-editable keys', async () => {
    const { service } = createService();
    const nonEditable = command({
      key: CONFIG_KEYS.features.practitionerApplicationAdminReviewEnabled,
    });

    await expect(service.update(nonEditable)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects invalid types and unregistered JSON schemas', async () => {
    const { service } = createService();

    await expect(
      service.update(command({ value: 'true' } as never)),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.update(
        command({
          key: CONFIG_KEYS.payment.provider.paymob.methodRegistry,
          value: [{ invalid: true }],
        } as never),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['AR', 'EN', 'arabic', 'english', 'fr', '', ' ar ', null, 1, [], {}])(
    'rejects invalid platform locale value %p before persistence',
    async (value) => {
      const { service, prisma } = createService();

      await expect(
        service.update(
          command({
            key: CONFIG_KEYS.platform.defaultLocale,
            value: value as never,
          }),
        ),
      ).rejects.toMatchObject({
        response: { error: 'CONFIG_VALUE_INVALID' },
      });

      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('rejects a batch containing an invalid platform locale before any write', async () => {
    const { service, prisma } = createService();

    await expect(
      service.updateMany([
        command(),
        command({
          key: CONFIG_KEYS.platform.defaultLocale,
          value: 'fr' as never,
        }),
      ]),
    ).rejects.toMatchObject({
      response: { error: 'CONFIG_VALUE_INVALID' },
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires explicit authority for user and system writes', async () => {
    const unauthorized = createService();
    await expect(
      unauthorized.service.update(
        command({
          actor: { type: 'USER', id: actor.id, permissions: [] },
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const system = createService();
    await expect(
      system.service.update(
        command({
          actor: {
            type: 'SYSTEM',
            permissions: ['configuration.system.write'],
          },
          actorType: 'SYSTEM',
        }),
      ),
    ).resolves.toMatchObject({ value: true });
  });

  it('redacts sensitive values before returning or auditing them', () => {
    const definition = { sensitive: true } as ConfigDefinition;
    expect(redactConfigurationValue(definition, 'secret')).toBe('[REDACTED]');
    expect(
      redactConfigurationValue(
        { sensitive: false } as ConfigDefinition,
        'value',
      ),
    ).toBe('value');
  });

  it('rejects stale concurrent updates', async () => {
    const current = {
      id: 'value-1',
      updatedAt: new Date('2026-08-02T11:00:00.000Z'),
      scopeType: ConfigScopeType.GLOBAL,
      scopeRefId: null,
      valueBoolean: false,
      valueString: null,
      valueNumber: null,
      valueJson: null,
    };
    const { service, tx } = createService(current);

    await expect(
      service.update(
        command({ expectedUpdatedAt: new Date('2026-08-02T10:00:00.000Z') }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.configValue.update).not.toHaveBeenCalled();
    expect(tx.configValue.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid effective-date range', async () => {
    const { service } = createService();

    await expect(
      service.update(
        command({
          effectiveFrom: new Date('2026-08-03T00:00:00.000Z'),
          effectiveTo: new Date('2026-08-02T00:00:00.000Z'),
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rolls back when persistence fails before the audit log is written', async () => {
    const transaction = createTransaction();
    transaction.tx.configValue.create.mockRejectedValue(
      new Error('write failed'),
    );
    const service = new ConfigurationManagementService(
      transaction.prisma as never,
      new ConfigurationAuthorizationService(),
    );

    await expect(service.update(command())).rejects.toThrow('write failed');
    expect(transaction.tx.configChangeLog.create).not.toHaveBeenCalled();
  });
});
