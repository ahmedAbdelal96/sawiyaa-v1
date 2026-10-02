import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { HelpService } from './services/help.service';
import { AdminHelpController } from './controllers/admin-help.controller';
import { PublicHelpController } from './controllers/public-help.controller';

@Module({
  controllers: [AdminHelpController, PublicHelpController],
  providers: [
    HelpService,
    JwtAccessAuthGuard,
    RolesGuard,
    PermissionsGuard,
    PermissionResolverService,
  ],
  exports: [HelpService],
})
export class HelpModule {}
