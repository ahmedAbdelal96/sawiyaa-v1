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

  it('keeps Admin settings free of direct ConfigValue persistence', () => {
    const source = readFileSync(
      __filename.replace(/\.spec\.ts$/, '.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/configValue\.(create|update|delete|upsert)/);
  });
});
