import { Module } from '@nestjs/common';
import { ConfigInternalGuard } from '@common/guards/internal/config-internal.guard';
import { ConfigController } from './controllers/config.controller';
import { ResolvedConfigMapper } from './mappers/resolved-config.mapper';
import { ConfigCatalogRepository } from './repositories/config-catalog.repository';
import { ConfigValueRepository } from './repositories/config-value.repository';
import { ConfigResolverService } from './services/config-resolver.service';
import { ResolveConfigValueUseCase } from './use-cases/resolve-config-value.use-case';

@Module({
  controllers: [ConfigController],
  providers: [
    ResolvedConfigMapper,
    ConfigCatalogRepository,
    ConfigValueRepository,
    ResolveConfigValueUseCase,
    ConfigResolverService,
    ConfigInternalGuard,
  ],
  exports: [ConfigResolverService, ResolveConfigValueUseCase],
})
export class ConfigModule {}
