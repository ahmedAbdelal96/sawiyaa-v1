import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma/prisma.module';
import { SecurityAuditRepository } from './security-audit.repository';
import { SecurityAuditService } from './security-audit.service';

/**
 * Global security audit module.
 * Import in AppModule to make SecurityAuditService available everywhere
 * without needing per-module imports.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [SecurityAuditRepository, SecurityAuditService],
  exports: [SecurityAuditService],
})
export class SecurityAuditModule {}
