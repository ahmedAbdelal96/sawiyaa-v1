import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigScopeType } from '@prisma/client';
import { ConfigInternalGuard } from '@common/guards/internal/config-internal.guard';
import {
  ResolveConfigParamsDto,
  ResolveConfigQueryDto,
} from '../dto/resolve-config.dto';
import { ConfigResolverService } from '../services/config-resolver.service';

/**
 * Config controller exposes a minimal internal-only read endpoint for resolved config values.
 * It remains intentionally small because application code should usually consume ConfigResolverService directly.
 */
@ApiTags('Config')
@Controller('config')
@UseGuards(ConfigInternalGuard)
export class ConfigController {
  constructor(private readonly configResolverService: ConfigResolverService) {}

  /** Internal-only HTTP fallback for reading one resolved config key with optional scoped resolution. */
  @Get(':key')
  @ApiHeader({
    name: 'x-config-internal-token',
    required: true,
    description: 'Internal token required for the config HTTP endpoint',
  })
  @ApiOperation({
    summary: 'Resolve a config value by key',
    description:
      'Reads a config key through the same internal resolution logic used by application services, with optional scoped lookup.',
  })
  @ApiParam({
    name: 'key',
    description: 'Logical config key from ConfigKeyCatalog',
  })
  @ApiQuery({
    name: 'scopeType',
    required: false,
    enum: ConfigScopeType,
    description: 'Optional scope type to resolve before GLOBAL fallback',
  })
  @ApiQuery({
    name: 'scopeRefId',
    required: false,
    description:
      'Scope reference id when scopeType is not GLOBAL. Must be omitted for GLOBAL.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Resolved config metadata and value. Sensitive values are redacted from the HTTP response.',
  })
  @ApiBadRequestResponse({
    description: 'Route params or scope query values failed validation',
  })
  @ApiForbiddenResponse({
    description: 'Internal token is missing or invalid for this endpoint',
  })
  @ApiNotFoundResponse({
    description:
      'Config HTTP endpoint is disabled or the internal route is not exposed',
  })
  async getConfigValue(
    @Param() params: ResolveConfigParamsDto,
    @Query() query: ResolveConfigQueryDto,
  ) {
    const scopes = query.scopeType
      ? [
          {
            scopeType: query.scopeType,
            scopeRefId:
              query.scopeType === ConfigScopeType.GLOBAL
                ? null
                : (query.scopeRefId ?? null),
          },
        ]
      : undefined;

    const resolved = await this.configResolverService.resolveValue(params.key, {
      scopes,
    });

    return {
      ...resolved,
      value: resolved.isSensitive ? null : resolved.value,
      isRedacted: resolved.isSensitive,
    };
  }
}
