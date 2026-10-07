import { readFileSync } from 'node:fs';
import { ForbiddenException } from '@nestjs/common';
import { AdminPlatformSettingsService } from './admin-platform-settings.service';
import { CONFIG_DEFINITIONS } from '../registry/config.definitions';
import {
  ADMIN_SETTING_DOMAINS,
  getAdminPlatformSettingMetadata,
} from '../registry/admin-platform-settings.metadata';

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
    const management = {
      update: jest.fn(),
      reset: jest.fn(),
      changeSet: jest.fn(),
    };
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
      editable: false,
      effectiveSource: 'SYSTEM_MANAGED',
      primaryDomain: 'general',
      enumOptions: ['ar', 'en'],
    });
    expect(
      result.settings
        .filter((setting) => setting.category === 'PAYMENT')
        .every((setting) => !setting.editable),
    ).toBe(true);
  });

  it('assigns every canonical definition one primary settings domain', () => {
    const primaryDomains = CONFIG_DEFINITIONS.map(
      (definition) => getAdminPlatformSettingMetadata(definition).primaryDomain,
    );

    expect(new Set(ADMIN_SETTING_DOMAINS).size).toBe(
      ADMIN_SETTING_DOMAINS.length,
    );
    expect(primaryDomains).toHaveLength(CONFIG_DEFINITIONS.length);
    expect(
      primaryDomains.every((domain) => ADMIN_SETTING_DOMAINS.includes(domain)),
    ).toBe(true);
  });

  it('projects authoritative domain, section, source, ownership, and capabilities', async () => {
    const { service } = createService();
    const result = await service.list({}, [
      'configuration.view',
      'configuration.edit.operational',
      'configuration.history.view',
    ]);

    const sessions = result.settings.find(
      (setting) => setting.key === 'INSTANT_BOOKING_REQUEST_TTL_MINUTES',
    );
    expect(sessions).toMatchObject({
      primaryDomain: 'sessions',
      section: 'instantBooking',
      effectiveSource: 'CATALOG_DEFAULT',
      ownership: 'BUSINESS',
      capabilities: {
        canView: true,
        canEdit: true,
        canReset: false,
        canViewHistory: true,
        requiresConfirmation: false,
        requiresReason: false,
        requiresStepUp: false,
        managedByDedicatedControl: false,
      },
    });
  });

  it('projects payment settings as dedicated-control metadata without making them editable', async () => {
    const { service } = createService();
    const result = await service.list({}, [
      'configuration.view',
      'configuration.edit.operational',
      'configuration.history.view',
    ]);

    const payment = result.settings.find(
      (setting) => setting.key === 'payment.provider.paymob.enabled',
    );
    expect(payment).toMatchObject({
      primaryDomain: 'paymentsFinance',
      section: 'providers',
      effectiveSource: 'DEDICATED_CONTROL',
      ownership: 'FINANCIAL',
      dedicatedRoute: '/admin/payments',
      capabilities: {
        canView: true,
        canEdit: false,
        canReset: false,
        canViewHistory: true,
        managedByDedicatedControl: true,
      },
    });
  });

  it('builds one authorized change set with one shared reason and returns effective settings', async () => {
    const { service, management } = createService();
    management.changeSet.mockResolvedValue([
      {
        key: 'packages.enabled',
        kind: 'update',
        changed: true,
        value: false,
        valueId: 'value-1',
        previousValueId: null,
        updatedAt: new Date('2026-10-06T00:00:00.000Z'),
        changeLogId: 'change-1',
      },
    ]);

    const result = await service.changeSet(
      {
        domain: 'sessions',
        reason: 'Tune routine session windows',
        changes: [
          {
            key: 'packages.enabled',
            value: false,
            expectedUpdatedAt: null,
          },
        ],
      },
      { id: 'admin-1', roles: [] } as never,
      ['configuration.view', 'configuration.edit.operational'],
    );

    const submittedChanges = (
      management.changeSet.mock.calls as unknown as Array<[unknown]>
    )[0]?.[0] as Array<{
      kind: string;
      command: { reason: string; key: string };
    }>;
    expect(
      submittedChanges.some(
        (change) =>
          change.kind === 'update' &&
          change.command.reason === 'Tune routine session windows' &&
          change.command.key === 'packages.enabled',
      ),
    ).toBe(true);
    expect(result.changedCount).toBe(1);
    expect(result.settings).toHaveLength(1);
  });

  it('keeps payment settings outside the generic change-set boundary', async () => {
    const { service, management } = createService();

    await expect(
      service.changeSet(
        {
          domain: 'paymentsFinance',
          reason: 'Change payment routing',
          changes: [{ key: 'payment.provider.paymob.enabled', value: false }],
        },
        { id: 'admin-1', roles: [] } as never,
        ['configuration.view', 'configuration.edit.operational'],
      ),
    ).rejects.toMatchObject({
      response: { error: 'CONFIG_FINANCIAL_DEDICATED_FLOW_REQUIRED' },
    });
    expect(management.changeSet).not.toHaveBeenCalled();
  });

  it('returns domain summaries whose ordinary counts equal unique ordinary settings', async () => {
    const { service } = createService();
    const result = await service.list({}, [
      'configuration.view',
      'configuration.edit.operational',
    ]);
    const ordinarySettings = result.settings.filter(
      (setting) =>
        !setting.capabilities.managedByDedicatedControl &&
        !setting.capabilities.advancedOnly,
    );
    const ordinaryDomainCount = result.domains
      .filter(
        (domain) =>
          domain.primaryDomain !== 'advanced' &&
          domain.primaryDomain !== 'paymentsFinance',
      )
      .reduce((sum, domain) => sum + domain.ordinaryCount, 0);

    expect(ordinaryDomainCount).toBe(ordinarySettings.length);
    expect(new Set(ordinarySettings.map((setting) => setting.key)).size).toBe(
      ordinarySettings.length,
    );
  });

  it('filters settings by the backend-owned domain without changing legacy compatibility fields', async () => {
    const { service } = createService();
    const result = await service.list({ domain: 'notifications' }, [
      'configuration.view',
      'configuration.edit.operational',
    ]);

    expect(result.settings.length).toBeGreaterThan(0);
    expect(
      result.settings.every(
        (setting) => setting.primaryDomain === 'notifications',
      ),
    ).toBe(true);
    expect(result.legacySettings.length).toBeGreaterThan(0);
    expect(result.settings.every((setting) => 'source' in setting)).toBe(true);
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
      result.legacySettings.every(
        (setting) => setting.status === 'LEGACY' && !setting.editable,
      ),
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
    ).rejects.toMatchObject({
      response: { error: 'CONFIG_LEGACY_DEPRECATED' },
    });

    // Try resetting a legacy setting
    await expect(
      service.reset(
        'SESSION_REMINDER_60_MINUTES_ENABLED',
        { reason: 'test' },
        { id: 'user', roles: [] } as never,
        ['configuration.view', 'configuration.edit.operational'],
      ),
    ).rejects.toMatchObject({
      response: { error: 'CONFIG_LEGACY_DEPRECATED' },
    });
  });

  it('keeps Admin settings free of direct ConfigValue persistence', () => {
    const source = readFileSync(
      __filename.replace(/\.spec\.ts$/, '.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/configValue\.(create|update|delete|upsert)/);
  });
});
