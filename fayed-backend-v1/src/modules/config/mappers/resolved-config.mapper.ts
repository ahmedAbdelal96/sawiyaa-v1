import { Injectable } from '@nestjs/common';
import {
  ConfigKeyCatalog,
  ConfigScopeType,
  ConfigValue,
  Prisma,
} from '@prisma/client';
import { ResolvedConfigValue } from '../types/config-scope.types';
import { extractDatabaseConfigValue } from '../utils/config-value.util';

@Injectable()
export class ResolvedConfigMapper {
  fromDatabase(
    configKey: ConfigKeyCatalog,
    configValue: ConfigValue,
    evaluatedAt: Date,
  ): ResolvedConfigValue {
    return {
      key: configKey.key,
      slug: configKey.slug,
      displayName: configKey.displayName,
      description: configKey.description,
      configKind: configKey.configKind,
      dataType: configKey.dataType,
      category: configKey.category,
      isSensitive: configKey.isSensitive,
      isRequired: configKey.isRequired,
      supportsOverride: configKey.supportsOverride,
      value: extractDatabaseConfigValue(configKey.dataType, configValue),
      source: 'database',
      scopeType: configValue.scopeType,
      scopeRefId: configValue.scopeRefId,
      matchedValueId: configValue.id,
      evaluatedAt,
    };
  }

  fromCatalogDefault(
    configKey: ConfigKeyCatalog,
    evaluatedAt: Date,
  ): ResolvedConfigValue {
    return {
      key: configKey.key,
      slug: configKey.slug,
      displayName: configKey.displayName,
      description: configKey.description,
      configKind: configKey.configKind,
      dataType: configKey.dataType,
      category: configKey.category,
      isSensitive: configKey.isSensitive,
      isRequired: configKey.isRequired,
      supportsOverride: configKey.supportsOverride,
      value: (configKey.defaultValueJson ?? null) as Prisma.JsonValue | null,
      source: 'catalog_default',
      scopeType: ConfigScopeType.GLOBAL,
      scopeRefId: null,
      matchedValueId: null,
      evaluatedAt,
    };
  }

  missing(configKey: ConfigKeyCatalog, evaluatedAt: Date): ResolvedConfigValue {
    return {
      key: configKey.key,
      slug: configKey.slug,
      displayName: configKey.displayName,
      description: configKey.description,
      configKind: configKey.configKind,
      dataType: configKey.dataType,
      category: configKey.category,
      isSensitive: configKey.isSensitive,
      isRequired: configKey.isRequired,
      supportsOverride: configKey.supportsOverride,
      value: null,
      source: 'missing',
      scopeType: null,
      scopeRefId: null,
      matchedValueId: null,
      evaluatedAt,
    };
  }
}
