import { Global, Module } from '@nestjs/common';
import { SecurityAuditService } from './security-audit.service';

/**
 * Global security audit module.
 * Import in AppModule to make SecurityAuditService available everywhere
 * without needing per-module imports.
 */
@Global()
@Module({
  providers: [SecurityAuditService],
  exports: [SecurityAuditService],
})
export class SecurityAuditModule {}
