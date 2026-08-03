import { ConfigCategory, ConfigKind, ConfigScopeType } from '@prisma/client';

export const CONFIG_VALUE_TYPES = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  STRING_ARRAY: 'STRING_ARRAY',
  JSON: 'JSON',
} as const;
export type ConfigValueType =
  (typeof CONFIG_VALUE_TYPES)[keyof typeof CONFIG_VALUE_TYPES];

export type ConfigOwner =
  | 'ENV_SECRET'
  | 'ENV_INFRASTRUCTURE'
  | 'DATABASE_CONFIG'
  | 'CODE_INVARIANT'
  | 'USER_PREFERENCE'
  | 'ENTITY_SNAPSHOT'
  | 'TEST_ONLY';

export type ConfigStatus =
  | 'ACTIVE'
  | 'PARTIALLY_ACTIVE'
  | 'SEEDED_BUT_UNUSED'
  | 'DUPLICATED_WITH_ENV'
  | 'MISNAMED'
  | 'WRITE_ONLY'
  | 'LEGACY';

export type ConfigDefaultPolicy =
  | 'SAFE_DEFAULT'
  | 'OPTIONAL_UNAVAILABLE'
  | 'REQUIRED_FAIL_CLOSED'
  | 'CATALOG_DEFAULT_COMPATIBILITY';

export type ConfigFailureMode =
  | 'USE_SAFE_DEFAULT'
  | 'TREAT_AS_UNAVAILABLE'
  | 'FAIL_CLOSED'
  | 'PRESERVE_CATALOG_SEMANTICS';

export type ConfigSnapshotPolicy =
  | 'NONE'
  | 'SNAPSHOT_ON_ENTITY_CREATION'
  | 'SNAPSHOT_ON_DECISION';

export type ConfigValidationStrategy =
  | 'SCALAR'
  | 'STRING_ENUM'
  | 'JSON_UNVALIDATED'
  | 'JSON_SCHEMA';

export type ConfigJsonSchemaId =
  | 'payment.provider.paymob.methodRegistry.v1'
  | 'payment.routing.currencyRoutes.v1';

export type ConfigCatalogMetadata = {
  readonly slug: string;
  readonly displayName: string;
  readonly description: string;
  readonly configKind: ConfigKind;
};

export type ConfigSeedValue = string | number | boolean | readonly string[];

export type ConfigSeedPolicy =
  | { readonly createInitialValue: false }
  | {
      readonly createInitialValue: true;
      readonly value: ConfigSeedValue;
      readonly priority: number;
      readonly effectiveFrom?: 'DAYS_AGO_2';
      readonly effectiveTo?: 'DAYS_FROM_NOW_365';
    };

export type ConfigUnit =
  | 'milliseconds'
  | 'seconds'
  | 'minutes'
  | 'hours'
  | 'percent'
  | 'count'
  | 'iso-code'
  | 'currency';

type ConfigScalar<T extends ConfigValueType> = T extends 'STRING'
  ? string
  : T extends 'NUMBER' | 'INTEGER'
    ? number
    : T extends 'BOOLEAN'
      ? boolean
      : T extends 'STRING_ARRAY'
        ? readonly string[]
        : unknown;

type DefaultMetadata<T> =
  | {
      readonly defaultPolicy: 'SAFE_DEFAULT' | 'CATALOG_DEFAULT_COMPATIBILITY';
      readonly defaultValue: T;
    }
  | {
      readonly defaultPolicy: 'OPTIONAL_UNAVAILABLE' | 'REQUIRED_FAIL_CLOSED';
      readonly defaultValue?: never;
    };

type DefinitionBase<T extends ConfigValueType, V> = {
  readonly key: string;
  readonly category: ConfigCategory;
  readonly domain: string;
  readonly owner: ConfigOwner;
  readonly valueType: T;
  readonly required: boolean;
  readonly allowedScopes: readonly ConfigScopeType[];
  readonly minimum?: T extends 'NUMBER' | 'INTEGER' ? number : never;
  readonly maximum?: T extends 'NUMBER' | 'INTEGER' ? number : never;
  readonly allowedValues?: T extends 'STRING' ? readonly string[] : never;
  readonly unit?: ConfigUnit;
  readonly editable: boolean;
  readonly sensitive: boolean;
  readonly requiresReason: boolean;
  readonly requiresConfirmation: boolean;
  readonly requiresStepUp: boolean;
  readonly failureMode: ConfigFailureMode;
  readonly snapshotPolicy: ConfigSnapshotPolicy;
  readonly status: ConfigStatus;
  readonly deprecatedReplacementKey?: string;
  readonly deprecationReason?: string;
  readonly description: string;
  readonly validationStrategy: ConfigValidationStrategy;
  readonly jsonSchemaId?: ConfigJsonSchemaId;
  readonly adminVisible: boolean;
  readonly catalog: ConfigCatalogMetadata;
  readonly seed: ConfigSeedPolicy;
} & DefaultMetadata<V>;

export type ConfigDefinitionFor<T extends ConfigValueType> = DefinitionBase<
  T,
  ConfigScalar<T>
> & {
  readonly valueType: T;
};

export type ConfigDefinition = {
  [T in ConfigValueType]: ConfigDefinitionFor<T>;
}[ConfigValueType];

export type ConfigRegistry = Readonly<Record<string, ConfigDefinition>>;
