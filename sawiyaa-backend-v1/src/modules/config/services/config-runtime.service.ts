import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigKey } from '../registry/config-key.constants';
import {
  BooleanConfigKey,
  JsonConfigKey,
  NumberConfigKey,
  StringConfigKey,
} from '../registry/config.registry';
import {
  ResolveConfigOptions,
  ResolvedConfigValue,
} from '../types/config-scope.types';
import { ConfigResolverService } from './config-resolver.service';

/**
 * Runtime read boundary for database-backed configuration.
 *
 * This service deliberately delegates to the existing resolver so precedence,
 * defaults, errors, and evaluation-time behavior remain unchanged.
 */
@Injectable()
export class ConfigRuntimeService {
  constructor(private readonly resolver: ConfigResolverService) {}

  resolveValue(
    key: ConfigKey,
    options?: ResolveConfigOptions,
  ): Promise<ResolvedConfigValue> {
    return this.resolver.resolveValue(key, options);
  }

  resolveByScope(
    key: ConfigKey,
    options?: ResolveConfigOptions,
  ): Promise<ResolvedConfigValue> {
    return this.resolver.resolveByScope(key, options);
  }

  getString(
    key: StringConfigKey,
    options?: ResolveConfigOptions,
  ): Promise<string> {
    return this.resolver.getRequiredString(key, options);
  }

  getRequiredString(
    key: StringConfigKey,
    options?: ResolveConfigOptions,
  ): Promise<string> {
    return this.resolver.getRequiredString(key, options);
  }

  getBoolean(
    key: BooleanConfigKey,
    options?: ResolveConfigOptions,
  ): Promise<boolean | null> {
    return this.resolver.getBoolean(key, options);
  }

  getNumber(
    key: NumberConfigKey,
    options?: ResolveConfigOptions,
  ): Promise<number | null> {
    return this.resolver.getNumber(key, options);
  }

  getJson<T = Prisma.JsonValue>(
    key: JsonConfigKey,
    options?: ResolveConfigOptions,
  ): Promise<T | null> {
    return this.resolver.getJson<T>(key, options);
  }
}
