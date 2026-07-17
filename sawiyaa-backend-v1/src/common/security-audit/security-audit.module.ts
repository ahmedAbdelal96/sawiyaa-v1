import { Global, Module } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditRepository } from './security-audit.repository';
import { SecurityAuditService } from './security-audit.service';

/**
 * Global security audit module.
 * Import in AppModule to make SecurityAuditService available everywhere
 * without needing per-module imports.
 */
@Global()
@Module({
  providers: [PrismaService, SecurityAuditRepository, SecurityAuditService],
  exports: [SecurityAuditService],
})
export class SecurityAuditModule {}
