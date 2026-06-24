import { Global, Module } from '@nestjs/common';
import { PermissionResolverService } from './authorization/permission-resolver.service';

/**
 * Common Auth Module — global shared authentication/authorization services.
 * Import in AppModule to make these services available application-wide
 * without needing per-module imports.
 */
@Global()
@Module({
  providers: [PermissionResolverService],
  exports: [PermissionResolverService],
})
export class CommonAuthModule {}