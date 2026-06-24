import { ConfigDataType, ConfigScopeType, Prisma } from '@prisma/client';

export interface ConfigScopeInput {
  scopeType: ConfigScopeType;
  scopeRefId?: string | null;
}

export interface ResolveConfigOptions {
  scopes?: ConfigScopeInput[];
  at?: Date;
}

export interface ConfigScopeMatch {
  scopeType: ConfigScopeType;
  scopeRefId: string | null;
}

export type ResolvedConfigSource = 'database' | 'catalog_default' | 'missing';

export interface ResolvedConfigValue {
  key: string;
  slug: string;
  displayName: string;
  description: string | null;
  configKind: string;
  dataType: ConfigDataType;
  category: string;
  isSensitive: boolean;
  isRequired: boolean;
  supportsOverride: boolean;
  value: Prisma.JsonValue | string | number | boolean | null;
  source: ResolvedConfigSource;
  scopeType: ConfigScopeType | null;
  scopeRefId: string | null;
  matchedValueId: string | null;
  evaluatedAt: Date;
}
