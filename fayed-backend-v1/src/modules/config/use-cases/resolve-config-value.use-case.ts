import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigScopeType } from '@prisma/client';
import { ConfigCatalogRepository } from '../repositories/config-catalog.repository';
import { ConfigValueRepository } from '../repositories/config-value.repository';
import {
  ResolveConfigOptions,
  ResolvedConfigValue,
} from '../types/config-scope.types';
import { ResolvedConfigMapper } from '../mappers/resolved-config.mapper';
import { isSameScope, normalizeScopeChain } from '../utils/config-scope.util';

@Injectable()
export class ResolveConfigValueUseCase {
  constructor(
    private readonly configCatalogRepository: ConfigCatalogRepository,
    private readonly configValueRepository: ConfigValueRepository,
    private readonly resolvedConfigMapper: ResolvedConfigMapper,
  ) {}

  async execute(
    key: string,
    options: ResolveConfigOptions = {},
  ): Promise<ResolvedConfigValue> {
    const configKey = await this.configCatalogRepository.findByKey(key);

    if (!configKey) {
      throw new NotFoundException(`Config key "${key}" was not found`);
    }

    const evaluatedAt = options.at ?? new Date();
    const requestedScopes = configKey.supportsOverride
      ? normalizeScopeChain(options.scopes)
      : normalizeScopeChain([{ scopeType: ConfigScopeType.GLOBAL }]);

    const candidates = await this.configValueRepository.findActiveCandidates(
      configKey.id,
      requestedScopes,
      evaluatedAt,
    );

    for (const scope of requestedScopes) {
      const matchedValue = candidates.find((candidate) =>
        isSameScope(scope, {
          scopeType: candidate.scopeType,
          scopeRefId: candidate.scopeRefId,
        }),
      );

      if (matchedValue) {
        return this.resolvedConfigMapper.fromDatabase(
          configKey,
          matchedValue,
          evaluatedAt,
        );
      }
    }

    if (configKey.defaultValueJson !== null) {
      return this.resolvedConfigMapper.fromCatalogDefault(
        configKey,
        evaluatedAt,
      );
    }

    return this.resolvedConfigMapper.missing(configKey, evaluatedAt);
  }
}
