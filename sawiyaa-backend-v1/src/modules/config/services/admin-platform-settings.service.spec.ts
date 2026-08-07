import { readFileSync } from 'node:fs';
import { ForbiddenException } from '@nestjs/common';
import { AdminPlatformSettingsService } from './admin-platform-settings.service';

describe('AdminPlatformSettingsService', () => {
  function createService() {
    const prisma = {
      configKeyCatalog: {
        findUnique: jest.fn().mockResolvedValue({ id: 'catalog-id' }),
      },
      configValue: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      configChangeLog: { count: jest.fn(), findMany: jest.fn() },
    };
    const runtime = {
      resolveValue: jest.fn((key: string) => ({
        key,
        value: key.includes('enabled'),
        source: 'catalog_default',
        matchedValueId: null,
        evaluatedAt: new Date('2026-08-02T12:00:00.000Z'),
      })),
    };
    const management = { update: jest.fn(), reset: jest.fn() };
    return {
      service: new AdminPlatformSettingsService(
        prisma as never,
        runtime as never,
        management as never,
      ),
      runtime,
      management,
      prisma,
    };
  }

  it('derives the Admin list from canonical visible definitions and redacts legacy/env settings', async () => {
    const { service } = createService();
    const result = await service.list({}, [
      'configuration.view',
      'configuration.edit.operational',
    ]);

    expect(result.settings.length).toBeGreaterThan(0);
    expect(
      result.settings.some((setting) => setting.key.startsWith('auth.')),
    ).toBe(false);
    expect(
      result.settings.some(
        (setting) => setting.key === 'packages.enabled' && setting.editable,
      ),
    ).toBe(true);
    expect(
      result.settings.find(
        (setting) => setting.key === 'platform.defaultLocale',
      ),
    ).toMatchObject({
      valueType: 'STRING',
      editable: true,
      enumOptions: ['ar', 'en'],
    });
    expect(
      result.settings
        .filter((setting) => setting.category === 'PAYMENT')
        .every((setting) => !setting.editable),
    ).toBe(true);
  });

  it('does not allow a generic financial write path', async () => {
    const { service } = createService();

    await expect(
      service.update(
        'payment.provider.paymob.enabled',
        { value: false, reason: 'test' },
        { id: 'user', roles: [] } as never,
        ['configuration.view', 'configuration.edit.operational'],
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns legacy settings in a separate array and forbids editing them', async () => {
    const { service } = createService();
    const result = await service.list({}, [
      'configuration.view',
      'configuration.edit.operational',
    ]);

    expect(result.legacySettings).toBeDefined();
    expect(result.legacySettings.length).toBeGreaterThan(0);
    expect(
      result.legacySettings.every((setting) => setting.status === 'LEGACY' && !setting.editable),
    );

    // Verify DTO fields on a legacy setting
    const legacyEmail = result.legacySettings.find(
      (s) => s.key === 'SESSION_REMINDER_60_MINUTES_ENABLED',
    );
    expect(legacyEmail).toBeDefined();
    expect(legacyEmail).toMatchObject({
      editable: false,
      readOnlyReason: 'LEGACY_DEPRECATED',
      status: 'LEGACY',
      deprecatedReplacementKey: 'SESSION_REMINDER_OFFSETS_MINUTES',
    });
    expect(legacyEmail!.uiMetadata).toBeNull();

    // Verify uiMetadata on active editable setting
    const offsets = result.settings.find(
      (s) => s.key === 'SESSION_REMINDER_OFFSETS_MINUTES',
    );
    expect(offsets).toBeDefined();
    expect(offsets!.uiMetadata).toMatchObject({
      control: 'integer-list',
    });

    // Try updating a legacy setting
    await expect(
      service.update(
        'SESSION_REMINDER_60_MINUTES_ENABLED',
        { value: true, reason: 'test' },
        { id: 'user', roles: [] } as never,
        ['configuration.view', 'configuration.edit.operational'],
      ),
    ).rejects.toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ error: 'CONFIG_LEGACY_DEPRECATED' }),
      }),
    );

    // Try resetting a legacy setting
    await expect(
      service.reset(
        'SESSION_REMINDER_60_MINUTES_ENABLED',
        { reason: 'test' },
        { id: 'user', roles: [] } as never,
        ['configuration.view', 'configuration.edit.operational'],
      ),
    ).rejects.toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ error: 'CONFIG_LEGACY_DEPRECATED' }),
      }),
    );
  });

  it('keeps Admin settings free of direct ConfigValue persistence', () => {
    const source = readFileSync(
      __filename.replace(/\.spec\.ts$/, '.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/configValue\.(create|update|delete|upsert)/);
  });
});
