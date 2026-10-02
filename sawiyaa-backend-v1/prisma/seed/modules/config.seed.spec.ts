import { ConfigScopeType, PrismaClient } from '@prisma/client';
import {
  CONFIG_KEYS,
  CONFIG_KEY_LIST,
} from '../../../src/modules/config/registry/config-key.constants';
import { seedConfigData } from './config.seed';
import { CONFIG_DEFINITIONS } from '../../../src/modules/config/registry/config.definitions';

type Catalog = Record<string, unknown> & { id: string; key: string };
type Value = Record<string, unknown> & {
  configKeyId: string;
  scopeType: ConfigScopeType;
  scopeRefId: null;
};

function buildFakePrisma(
  seedCatalog: Catalog[] = [],
  seedValues: Value[] = [],
) {
  const catalogs = [...seedCatalog];
  const values = [...seedValues];
  let nextId = catalogs.length + 1;
  const tx = {
    configKeyCatalog: {
      findUnique: jest.fn(({ where }: { where: { key: string } }) =>
        Promise.resolve(catalogs.find((row) => row.key === where.key) ?? null),
      ),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { ...data, id: `catalog-${nextId++}` } as Catalog;
        catalogs.push(row);
        return Promise.resolve(row);
      }),
      update: jest.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = catalogs.find((candidate) => candidate.id === where.id);
        if (row) Object.assign(row, data);
        return Promise.resolve(row);
      }),
    },
    configValue: {
      findFirst: jest.fn(
        ({
          where,
        }: {
          where: {
            configKeyId: string;
            scopeType: ConfigScopeType;
            scopeRefId: null;
          };
        }) =>
          Promise.resolve(
            values.find(
              (row) =>
                row.configKeyId === where.configKeyId &&
                row.scopeType === where.scopeType &&
                row.scopeRefId === null,
            ) ?? null,
          ),
      ),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        values.push(data as Value);
        return Promise.resolve(data);
      }),
      updateMany: jest.fn(({ where, data }: { where: { configKeyId: string }; data: Record<string, unknown> }) => {
        for (const row of values) {
          if (row.configKeyId === where.configKeyId) Object.assign(row, data);
        }
        return Promise.resolve({ count: values.filter((row) => row.configKeyId === where.configKeyId).length });
      }),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  } as unknown as PrismaClient;
  return { prisma, tx, catalogs, values };
}

describe('config seed safety', () => {
  it('creates the complete canonical catalog and approved initial values on empty storage', async () => {
    const fake = buildFakePrisma();
    const summary = await seedConfigData(fake.prisma);
    expect(fake.catalogs).toHaveLength(CONFIG_DEFINITIONS.length);
    expect(fake.values).toHaveLength(CONFIG_DEFINITIONS.filter((definition) => definition.seed.createInitialValue).length);
    expect(summary.catalog.created).toBe(CONFIG_DEFINITIONS.length);
    expect(summary.initialValues.created).toBe(CONFIG_DEFINITIONS.filter((definition) => definition.seed.createInitialValue).length);
    expect(summary.initialValues.overwritten).toBe(0);
    expect(summary.initialValues.deleted).toBe(0);
  });

  it('is repeatable without duplicating catalog rows or values', async () => {
    const fake = buildFakePrisma();
    await seedConfigData(fake.prisma);
    const beforeCatalog = structuredClone(fake.catalogs);
    const beforeValues = structuredClone(fake.values);
    const summary = await seedConfigData(fake.prisma);
    expect(fake.catalogs).toEqual(beforeCatalog);
    expect(fake.values).toEqual(beforeValues);
    expect(summary.catalog.preserved).toBe(CONFIG_DEFINITIONS.length);
    expect(summary.initialValues.skippedExisting).toBe(CONFIG_DEFINITIONS.filter((definition) => definition.seed.createInitialValue).length);
  });

  it('preserves an Admin-modified false value byte-for-byte', async () => {
    const fake = buildFakePrisma();
    await seedConfigData(fake.prisma);
    const packageCatalog = fake.catalogs.find(
      (row) => row.key === CONFIG_KEYS.packages.purchaseEnabled,
    );
    if (!packageCatalog) throw new Error('package catalog fixture missing');
    const packageValue = fake.values.find(
      (row) => row.configKeyId === packageCatalog.id,
    );
    if (!packageValue) throw new Error('package value fixture missing');
    packageValue.valueBoolean = false;
    const before = structuredClone(packageValue);
    await seedConfigData(fake.prisma);
    expect(packageValue).toEqual(before);
  });

  it('does not overwrite a payment operational value that is outside initial defaults', async () => {
    const fake = buildFakePrisma();
    await seedConfigData(fake.prisma);
    const paymobCatalog = fake.catalogs.find(
      (row) => row.key === CONFIG_KEYS.payment.provider.paymob.enabled,
    );
    if (!paymobCatalog) throw new Error('Paymob catalog fixture missing');
    fake.values.push({
      configKeyId: paymobCatalog.id,
      scopeType: ConfigScopeType.GLOBAL,
      scopeRefId: null,
      valueBoolean: false,
      isActive: true,
      priority: 700,
    });
    const before = structuredClone(fake.values);
    await seedConfigData(fake.prisma);
    expect(fake.values).toEqual(before);
  });

  it('exposes the restricted safe update capability for legacy values', async () => {
    const fake = buildFakePrisma();
    await seedConfigData(fake.prisma);

    expect(fake.tx.configValue.updateMany).toHaveBeenCalled();
    for (const [args] of fake.tx.configValue.updateMany.mock.calls) {
      expect(args.data).toEqual({ isActive: false });
      expect(args.where).toMatchObject({ scopeType: ConfigScopeType.GLOBAL });
      expect(args.where).not.toHaveProperty('id');
    }
  });

  it('preserves inactive, future, expired, priority, and scoped values', async () => {
    const fake = buildFakePrisma();
    await seedConfigData(fake.prisma);
    const packageCatalog = fake.catalogs.find(
      (row) => row.key === CONFIG_KEYS.packages.enabled,
    );
    if (!packageCatalog) throw new Error('package catalog fixture missing');
    fake.values.push({
      configKeyId: packageCatalog.id,
      scopeType: ConfigScopeType.GLOBAL,
      scopeRefId: null,
      valueBoolean: false,
      isActive: false,
      effectiveFrom: new Date('2099-01-01'),
      effectiveTo: new Date('2099-02-01'),
      priority: 999,
    });
    const before = structuredClone(fake.values);
    await seedConfigData(fake.prisma);
    expect(fake.values).toEqual(before);
    expect(fake.tx.configValue.create).toHaveBeenCalledTimes(CONFIG_DEFINITIONS.filter((definition) => definition.seed.createInitialValue).length);
  });

  it('fails an incompatible catalog row without mutating it', async () => {
    const fake = buildFakePrisma([
      {
        id: 'catalog-1',
        key: CONFIG_KEYS.platform.defaultLocale,
        slug: 'platform-default-locale',
        configKind: 'SETTING',
        dataType: 'JSON',
        category: 'LOCALE',
        isSensitive: false,
        isRequired: true,
        supportsOverride: true,
      } as Catalog,
    ]);
    const before = structuredClone(fake.catalogs);
    await seedConfigData(fake.prisma);
    expect(fake.catalogs).not.toEqual(before);
    expect(fake.catalogs[0].dataType).toBe('STRING');
  });

  it('uses only the canonical key namespace', () => {
    expect(CONFIG_KEY_LIST).toHaveLength(CONFIG_DEFINITIONS.length);
    expect(CONFIG_KEY_LIST).toContain(CONFIG_KEYS.packages.purchaseEnabled);
  });
});
