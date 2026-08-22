import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { CONFIG_KEY_LIST, CONFIG_KEYS } from './config-key.constants';
import { CONFIG_DEFINITIONS } from './config.definitions';
import { CONFIG_REGISTRY } from './config.registry';
import { CONFIG } from '../config.registry';
import {
  assertValidConfigRegistry,
  validateConfigRegistry,
} from './config-registry.validator';
import {
  CONFIG_BOUNDARY_ALLOWLIST,
  checkGovernanceAllowlist,
  findGovernanceViolations,
  findDirectConfigWriteViolations,
  isAllowlistedGovernanceViolation,
} from './config-governance.boundary';

const backendRoot = join(__dirname, '..', '..', '..', '..');
describe('configuration governance registry', () => {
  it('has one immutable definition for every canonical database key', () => {
    assertValidConfigRegistry(CONFIG_DEFINITIONS, CONFIG_KEY_LIST);
    expect(Object.keys(CONFIG_REGISTRY)).toHaveLength(CONFIG_KEY_LIST.length);
    expect(Object.isFrozen(CONFIG_KEY_LIST)).toBe(true);
    expect(Object.isFrozen(CONFIG_DEFINITIONS)).toBe(true);
    expect(Object.isFrozen(CONFIG_DEFINITIONS[0])).toBe(true);
    expect(Object.isFrozen(CONFIG_DEFINITIONS[5].defaultValue)).toBe(true);
    expect(Object.isFrozen(CONFIG_REGISTRY)).toBe(true);
    expect(Object.isFrozen(CONFIG_KEYS)).toBe(true);
  });

  it('exposes the canonical developer facade and exactly one owner per definition', () => {
    expect(CONFIG.packages.enabled.key).toBe(CONFIG_KEYS.packages.enabled);
    expect(CONFIG.packages.enabled.definition).toBe(
      CONFIG_REGISTRY[CONFIG_KEYS.packages.enabled],
    );
    for (const definition of CONFIG_DEFINITIONS) {
      expect([
        'ENV_SECRET',
        'ENV_INFRASTRUCTURE',
        'DATABASE_CONFIG',
        'CODE_INVARIANT',
        'USER_PREFERENCE',
        'ENTITY_SNAPSHOT',
        'TEST_ONLY',
      ]).toContain(definition.owner);
      expect(definition.owner).toBeTruthy();
      if (definition.status === 'LEGACY') {
        expect(definition.editable).toBe(false);
        expect(definition.deprecationReason).toBeTruthy();
      }
    }
  });

  it('defines the platform locale as an exact canonical enum', () => {
    const definition = CONFIG_DEFINITIONS.find(
      (item) => item.key === CONFIG_KEYS.platform.defaultLocale,
    );

    expect(definition).toMatchObject({
      owner: 'DATABASE_CONFIG',
      editable: true,
      valueType: 'STRING',
      validationStrategy: 'STRING_ENUM',
      defaultValue: 'en',
      allowedValues: ['ar', 'en'],
    });
  });

  it('derives keys, catalog metadata, and seed policy from the canonical definitions', () => {
    expect(CONFIG_KEY_LIST).toEqual(
      CONFIG_DEFINITIONS.map((definition) => definition.key),
    );
    expect(new Set(CONFIG_KEY_LIST).size).toBe(CONFIG_KEY_LIST.length);
    expect(CONFIG_KEYS.packages.enabled).toBe('packages.enabled');
    expect(CONFIG_KEYS.payment.provider.paymob.methodRegistry).toBe(
      'payment.provider.paymob.methodRegistry',
    );

    expect(CONFIG_DEFINITIONS.length).toBeGreaterThan(0);
    expect(CONFIG_DEFINITIONS.filter((definition) => definition.owner === 'DATABASE_CONFIG').length)
      .toBeGreaterThan(0);
    expect(CONFIG_DEFINITIONS.filter((definition) => definition.status === 'LEGACY').length)
      .toBeGreaterThan(0);
    expect(CONFIG_DEFINITIONS.filter((definition) => definition.editable).length)
      .toBeGreaterThan(0);
    expect(CONFIG_DEFINITIONS.filter((definition) => definition.seed.createInitialValue).length)
      .toBeGreaterThan(0);
    const catalogSlugs = CONFIG_DEFINITIONS.map(
      (definition) => definition.catalog.slug,
    );
    expect(new Set(catalogSlugs).size).toBe(catalogSlugs.length);

    for (const definition of CONFIG_DEFINITIONS) {
      expect(definition.catalog.slug).toBeTruthy();
      expect(definition.catalog.displayName).toBeTruthy();
      expect(definition.catalog.description).toBeTruthy();
      expect(definition.catalog.configKind).toBeTruthy();
      if (definition.editable) expect(definition.owner).toBe('DATABASE_CONFIG');
      if (definition.status === 'LEGACY') {
        expect(definition.seed.createInitialValue).toBe(false);
      }
    }

    const seedSource = readFileSync(
      join(backendRoot, 'prisma', 'seed', 'modules', 'config.seed.ts'),
      'utf8',
    );
    expect(seedSource).not.toMatch(/catalogMetadata|const initialValues/);
  });

  it('keeps the direct Config table exception list exact and live', () => {
    expect(
      CONFIG_BOUNDARY_ALLOWLIST.DIRECT_CONFIG_TABLE.every((file) =>
        existsSync(join(backendRoot, file)),
      ),
    ).toBe(true);
    expect(CONFIG_BOUNDARY_ALLOWLIST.DIRECT_CONFIG_TABLE).not.toContain(
      'src/modules/payment-gateway-control/repositories/payment-gateway-control.repository.ts',
    );
    expect(
      CONFIG_BOUNDARY_ALLOWLIST.DIRECT_CONFIG_TABLE.some((file) =>
        file.includes('*'),
      ),
    ).toBe(false);
  });

  it('fails new direct Config, raw-key, ENV, and ConfigService policy access', () => {
    const samples = [
      'prisma.configValue.findMany()',
      "const key = 'packages.enabled'",
      'process.env.STRIPE_SECRET_KEY',
      "ConfigService.get('packages.enabled')",
    ];
    for (const source of samples) {
      expect(
        findGovernanceViolations('new-file.ts', source, CONFIG_KEY_LIST),
      ).not.toHaveLength(0);
    }
  });

  it('does not reintroduce removed business ENV names', () => {
    const forbidden = [
      'PAYMENT_STRIPE_ENABLED',
      'PAYMENT_PAYMOB_ENABLED',
      'PAYMOB_CHECKOUT_FLOW',
      'PAYMOB_DEFAULT_CHECKOUT_METHOD',
      'PAYMOB_METHOD_REGISTRY_JSON',
    ];
    const visit = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          if (!['generated', 'node_modules', 'dist'].includes(entry.name))
            visit(path);
          continue;
        }
        if (
          (entry.name.endsWith('.ts') || entry.name.endsWith('.example')) &&
          path !== __filename
        ) {
          const source = readFileSync(path, 'utf8');
          for (const name of forbidden) expect(source).not.toContain(name);
        }
      }
    };
    visit(backendRoot);
  });

  it('keeps allowlists exact, path-based, and shrinkable', () => {
    for (const files of Object.values(CONFIG_BOUNDARY_ALLOWLIST)) {
      expect(files.every((file) => !file.includes('*'))).toBe(true);
      for (const file of files) {
        expect(existsSync(join(backendRoot, file))).toBe(true);
      }
    }
    expect(
      isAllowlistedGovernanceViolation({
        boundary: 'DIRECT_CONFIG_TABLE',
        file: 'new-file.ts',
      }),
    ).toBe(false);
    expect(
      isAllowlistedGovernanceViolation({
        boundary: 'DIRECT_CONFIG_TABLE',
        file: CONFIG_BOUNDARY_ALLOWLIST.DIRECT_CONFIG_TABLE[0],
      }),
    ).toBe(true);
    const allAllowlistedFiles = new Set(
      Object.values(CONFIG_BOUNDARY_ALLOWLIST).flat(),
    );
    const allowlistCheck = checkGovernanceAllowlist(
      CONFIG_BOUNDARY_ALLOWLIST,
      allAllowlistedFiles,
    );
    expect(allowlistCheck.missing).toHaveLength(0);
    expect(allowlistCheck.stale).toHaveLength(0);
    expect(allowlistCheck.duplicates).toHaveLength(0);
  });

  it('allows direct Config writes only in approved compatibility or boundary files', () => {
    const files: string[] = [];
    const visit = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          if (!['generated', 'node_modules', 'dist'].includes(entry.name)) {
            visit(path);
          }
          continue;
        }
        if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
          files.push(path);
        }
      }
    };

    visit(join(backendRoot, 'src'));
    visit(join(backendRoot, 'prisma'));

    for (const file of files) {
      const relativePath = relative(backendRoot, file).replace(/\\/g, '/');
      for (const violation of findDirectConfigWriteViolations(
        relativePath,
        readFileSync(file, 'utf8'),
      )) {
        expect(isAllowlistedGovernanceViolation(violation)).toBe(true);
      }
    }
  });

  it('rejects duplicate, missing, out-of-range, and sensitive editable definitions', () => {
    const base = CONFIG_DEFINITIONS[0];
    expect(validateConfigRegistry([base, base], [base.key])).toContain(
      `duplicate definition: ${base.key}`,
    );
    expect(validateConfigRegistry([], [base.key])).toContain(
      `canonical key without definition: ${base.key}`,
    );
    expect(
      validateConfigRegistry(
        [{ ...base, key: 'not.canonical' } as unknown as typeof base],
        [base.key],
      ).some((error) => error.includes('definition outside canonical keys')),
    ).toBe(true);
    expect(
      validateConfigRegistry(
        [{ ...base, sensitive: true, editable: true }],
        [base.key],
      ).some((error) => error.includes('sensitive values cannot be editable')),
    ).toBe(true);
  });

  it('rejects invalid integer and bounded defaults', () => {
    const numeric = CONFIG_DEFINITIONS.find(
      (definition) => definition.valueType === 'NUMBER',
    );
    if (!numeric || !('defaultValue' in numeric))
      throw new Error('numeric registry fixture missing');
    expect(
      validateConfigRegistry(
        [{ ...numeric, valueType: 'INTEGER', defaultValue: 1.5 }],
        [numeric.key],
      ).some((error) => error.includes('integer default')),
    ).toBe(true);
    expect(
      validateConfigRegistry([{ ...numeric, minimum: 99 }], [numeric.key]).some(
        (error) => error.includes('below minimum'),
      ),
    ).toBe(true);
    expect(
      validateConfigRegistry(
        [
          {
            ...numeric,
            defaultValue: 'not-a-number',
          } as unknown as typeof numeric,
        ],
        [numeric.key],
      ).some((error) => error.includes('does not match')),
    ).toBe(true);
    expect(
      validateConfigRegistry(
        [{ ...numeric, defaultValue: Number.NaN } as unknown as typeof numeric],
        [numeric.key],
      ).some((error) => error.includes('does not match')),
    ).toBe(true);
  });

  it('rejects missing replacements and replacement cycles', () => {
    const [first, second] = CONFIG_DEFINITIONS.slice(0, 2);
    expect(
      validateConfigRegistry(
        [{ ...first, status: 'LEGACY', deprecatedReplacementKey: second.key }],
        [first.key],
      ),
    ).toContain(`${first.key}: replacement key does not exist`);
    expect(
      validateConfigRegistry(
        [
          { ...first, status: 'LEGACY', deprecatedReplacementKey: second.key },
          { ...second, status: 'LEGACY', deprecatedReplacementKey: first.key },
        ],
        [first.key, second.key],
      ).some((error) => error.includes('cyclic replacement aliases')),
    ).toBe(true);
  });

  it('requires explicit JSON validation before JSON becomes editable', () => {
    const json = CONFIG_DEFINITIONS.find(
      (definition) => definition.valueType === 'JSON',
    );
    if (!json) throw new Error('JSON registry fixture missing');
    expect(json.editable).toBe(true);
    expect(json.validationStrategy).toBe('JSON_SCHEMA');
    expect(json.jsonSchemaId).toBeDefined();
    expect(
      validateConfigRegistry(
        [
          {
            ...json,
            editable: true,
            validationStrategy: 'JSON_UNVALIDATED',
            jsonSchemaId: undefined,
          },
        ],
        [json.key],
      ).some((error) => error.includes('editable JSON requires JSON_SCHEMA')),
    ).toBe(true);
  });
});
