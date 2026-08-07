import { Module } from '@nestjs/common';
import { ConfigInternalGuard } from '@common/guards/internal/config-internal.guard';
import { ConfigController } from './controllers/config.controller';
import { AdminPlatformSettingsController } from './controllers/admin-platform-settings.controller';
import { ResolvedConfigMapper } from './mappers/resolved-config.mapper';
import { ConfigCatalogRepository } from './repositories/config-catalog.repository';
import { ConfigValueRepository } from './repositories/config-value.repository';
import { ConfigResolverService } from './services/config-resolver.service';
import { ConfigRuntimeService } from './services/config-runtime.service';
import { ConfigurationAuthorizationService } from './services/configuration-authorization.service';
import { ConfigurationManagementService } from './services/configuration-management.service';
import { AdminPlatformSettingsService } from './services/admin-platform-settings.service';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { PrismaService } from '@common/prisma/prisma.service';
import { ResolveConfigValueUseCase } from './use-cases/resolve-config-value.use-case';
import { SessionSchedulePolicyService } from './services/session-schedule-policy.service';

@Module({
  controllers: [ConfigController, AdminPlatformSettingsController],
  providers: [
    ResolvedConfigMapper,
    ConfigCatalogRepository,
    ConfigValueRepository,
    ResolveConfigValueUseCase,
    ConfigResolverService,
    ConfigRuntimeService,
    ConfigurationAuthorizationService,
    ConfigurationManagementService,
    ConfigInternalGuard,
    AdminPlatformSettingsService,
    PermissionResolverService,
    JwtAccessAuthGuard,
    RolesGuard,
    PermissionsGuard,
    PrismaService,
    SessionSchedulePolicyService,
  ],
  exports: [
    ConfigResolverService,
    ConfigRuntimeService,
    ConfigurationAuthorizationService,
    ConfigurationManagementService,
    ResolveConfigValueUseCase,
    SessionSchedulePolicyService,
  ],
})
export class ConfigModule {}
