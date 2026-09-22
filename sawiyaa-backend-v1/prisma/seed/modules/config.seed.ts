import {
  ConfigCategory,
  ConfigDataType,
  ConfigKind,
  ConfigScopeType,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { PLATFORM_DEFAULTS } from '../../../src/modules/config/registry/platform-defaults';
import { ConfigKey } from '../../../src/modules/config/registry/config-key.constants';
import { ConfigDefinition } from '../../../src/modules/config/registry/config-definition.types';
import { SeedModule } from '../shared/seed.types';
import { daysAgo, daysFromNow } from '../shared/seed.utils';

type ConfigSeedDb = Pick<PrismaClient, '$transaction'> & {
  configKeyCatalog: {
    findUnique: (args: {
      where: { key: string };
    }) => Promise<CatalogRow | null>;
    create: (args: {
      data: Prisma.ConfigKeyCatalogCreateInput;
    }) => Promise<CatalogRow>;
    update: (args: {
      where: { id: string };
      data: Prisma.ConfigKeyCatalogUpdateInput;
    }) => Promise<CatalogRow>;
  };
  configValue: {
    findFirst: (args: {
      where: {
        configKeyId: string;
        scopeType: ConfigScopeType;
        scopeRefId: null;
      };
    }) => Promise<Record<string, unknown> | null>;
    create: (args: {
      data: Prisma.ConfigValueUncheckedCreateInput;
    }) => Promise<Record<string, unknown>>;
    // This is intentionally the only bulk mutation exposed by the seed
    // adapter. It deactivates legacy database-config rows; it never deletes
    // records and does not change active operator-owned configuration.
    updateMany: (args: {
      where: Prisma.ConfigValueWhereInput;
      data: Prisma.ConfigValueUpdateManyMutationInput;
    }) => Promise<{ count: number }>;
  };
};

type CatalogRow = {
  id: string;
  key: string;
  slug: string;
  configKind: ConfigKind;
  dataType: ConfigDataType;
  category: ConfigCategory;
  isSensitive: boolean;
  isRequired: boolean;
  supportsOverride: boolean;
};

export type ConfigSeedSummary = {
  catalog: { created: number; metadataSynchronized: number; preserved: number };
  initialValues: {
    created: number;
    skippedExisting: number;
    preserved: number;
    overwritten: 0;
    deleted: 0;
  };
};

function toPrismaDataType(valueType: string): ConfigDataType {
  if (valueType === 'STRING_ARRAY') return ConfigDataType.STRING_ARRAY;
  if (valueType === 'BOOLEAN') return ConfigDataType.BOOLEAN;
  if (valueType === 'JSON') return ConfigDataType.JSON;
  return valueType === 'STRING' ? ConfigDataType.STRING : ConfigDataType.NUMBER;
}

function supportsOverride(definition: ConfigDefinition): boolean {
  return !definition.owner.startsWith('ENV_');
}

function assertCatalogCompatibility(
  row: CatalogRow,
  definition: ConfigDefinition,
): void {
  const expected = {
    configKind: definition.catalog.configKind,
    dataType: toPrismaDataType(definition.valueType),
    category: definition.category,
    isSensitive: definition.sensitive,
    isRequired: definition.required,
    supportsOverride: supportsOverride(definition),
  };
  for (const field of Object.keys(expected) as Array<keyof typeof expected>) {
    if (row[field] !== expected[field]) {
      throw new Error(
        `Config catalog conflict for "${definition.key}" (${field})`,
      );
    }
  }
}

function buildInitialValue(
  definition: ConfigDefinition,
): Omit<Prisma.ConfigValueUncheckedCreateInput, 'configKeyId'> {
  if (definition.seed.createInitialValue !== true) {
    throw new Error(`Definition "${definition.key}" is not seed-enabled`);
  }
  const { value, priority } = definition.seed;
  const dateFields = {
    ...(definition.seed.effectiveFrom === 'DAYS_AGO_2'
      ? { effectiveFrom: daysAgo(2) }
      : {}),
    ...(definition.seed.effectiveTo === 'DAYS_FROM_NOW_365'
      ? { effectiveTo: daysFromNow(365) }
      : {}),
  };
  const base = {
    scopeType: ConfigScopeType.GLOBAL,
    scopeRefId: null,
    priority,
    isActive: true,
    ...dateFields,
  };
  if (typeof value === 'boolean') return { ...base, valueBoolean: value };
  if (typeof value === 'number') return { ...base, valueNumber: value };
  if (typeof value === 'string') return { ...base, valueString: value };
  return { ...base, valueJson: value as Prisma.InputJsonValue };
}

async function seedConfigOnce(db: ConfigSeedDb): Promise<ConfigSeedSummary> {
  const summary: ConfigSeedSummary = {
    catalog: { created: 0, metadataSynchronized: 0, preserved: 0 },
    initialValues: {
      created: 0,
      skippedExisting: 0,
      preserved: 0,
      overwritten: 0,
      deleted: 0,
    },
  };
  const keyRows = new Map<ConfigKey, CatalogRow>();

  for (const definition of PLATFORM_DEFAULTS.configDefinitions) {
    const existing = await db.configKeyCatalog.findUnique({
      where: { key: definition.key },
    });
    if (existing) {
      // Development seeds must converge an older local catalog onto the typed
      // registry. Values are preserved below; only catalog metadata changes.
      if (JSON.stringify({
        slug: existing.slug, configKind: existing.configKind, dataType: existing.dataType,
        category: existing.category, isSensitive: existing.isSensitive,
        isRequired: existing.isRequired, supportsOverride: existing.supportsOverride,
      }) !== JSON.stringify({
        slug: definition.catalog.slug, configKind: definition.catalog.configKind,
        dataType: toPrismaDataType(definition.valueType), category: definition.category,
        isSensitive: definition.sensitive, isRequired: definition.required,
        supportsOverride: supportsOverride(definition),
      })) {
        await db.configKeyCatalog.update({
          where: { id: existing.id },
          data: {
            slug: definition.catalog.slug,
            displayName: definition.catalog.displayName,
            description: definition.catalog.description,
            configKind: definition.catalog.configKind,
            dataType: toPrismaDataType(definition.valueType),
            category: definition.category,
            isSensitive: definition.sensitive,
            isRequired: definition.required,
            supportsOverride: supportsOverride(definition),
            defaultValueJson:
              'defaultValue' in definition
                ? (definition.defaultValue as Prisma.InputJsonValue)
                : Prisma.JsonNull,
          },
        });
        summary.catalog.metadataSynchronized += 1;
      }
      keyRows.set(definition.key as ConfigKey, existing);
      summary.catalog.preserved += 1;
      continue;
    }
    const created = await db.configKeyCatalog.create({
      data: {
        key: definition.key,
        slug: definition.catalog.slug,
        displayName: definition.catalog.displayName,
        description: definition.catalog.description,
        configKind: definition.catalog.configKind,
        dataType: toPrismaDataType(definition.valueType),
        category: definition.category,
        isSensitive: definition.sensitive,
        isRequired: definition.required,
        supportsOverride: supportsOverride(definition),
        defaultValueJson:
          'defaultValue' in definition
            ? (definition.defaultValue as Prisma.InputJsonValue)
            : undefined,
      },
    });
    keyRows.set(definition.key as ConfigKey, created);
    summary.catalog.created += 1;
  }

  for (const definition of PLATFORM_DEFAULTS.databaseConfig) {
    if (definition.seed.createInitialValue !== true) continue;
    const row = keyRows.get(definition.key as ConfigKey);
    if (!row)
      throw new Error(`Config catalog row missing for "${definition.key}"`);
    const existing = await db.configValue.findFirst({
      where: {
        configKeyId: row.id,
        scopeType: ConfigScopeType.GLOBAL,
        scopeRefId: null,
      },
    });
    if (existing) {
      summary.initialValues.skippedExisting += 1;
      summary.initialValues.preserved += 1;
      continue;
    }
    await db.configValue.create({
      data: { configKeyId: row.id, ...buildInitialValue(definition) },
    });
    summary.initialValues.created += 1;
  }

  // Historical database-config values must not remain an alternate source of
  // runtime policy after their registry definition is marked LEGACY.
  for (const definition of PLATFORM_DEFAULTS.configDefinitions) {
    if (definition.status !== 'LEGACY' || definition.owner !== 'DATABASE_CONFIG') continue;
    const row = keyRows.get(definition.key as ConfigKey);
    if (!row) continue;
    await db.configValue.updateMany({
      where: { configKeyId: row.id, scopeType: ConfigScopeType.GLOBAL },
      data: { isActive: false },
    });
  }
  return summary;
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'P2034' || error.code === 'P2002')
  );
}

export async function seedConfigData(
  prisma: PrismaClient,
): Promise<ConfigSeedSummary> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        (tx) => seedConfigOnce(tx as unknown as ConfigSeedDb),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (!isRetryableTransactionError(error) || attempt === 3) throw error;
    }
  }
  throw new Error('Config seed exhausted its retry budget');
}

export const configSeedModule: SeedModule = {
  name: 'config',
  async run(prisma: PrismaClient): Promise<void> {
    await seedConfigData(prisma);
  },
};
