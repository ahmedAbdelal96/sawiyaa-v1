import { Module } from '@nestjs/common';
import { PractitionerApplicationsAdminModule } from './practitioner-applications/practitioner-applications-admin.module';

/**
 * Admin Module entry-point.
 * In Phase 1, it only exposes practitioner application review/decision APIs.
 */
@Module({
  imports: [PractitionerApplicationsAdminModule],
})
export class AdminModule {}
