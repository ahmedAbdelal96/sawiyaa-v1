import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma/prisma.module';
import { ConfigModule } from '@modules/config/config.module';
import { FilePolicyService } from './file-policy.service';
import { FileValidationService } from './file-validation.service';
import { UnifiedFileStorageService } from './unified-file-storage.service';
import { FileReconciliationService } from './file-reconciliation.service';

@Global()
@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [
    FilePolicyService,
    FileValidationService,
    UnifiedFileStorageService,
    FileReconciliationService,
  ],
  exports: [
    FilePolicyService,
    FileValidationService,
    UnifiedFileStorageService,
    FileReconciliationService,
  ],
})
export class FilesModule {}
