import { Module } from '@nestjs/common';
import { FeaturedPractitionersAdminModule } from './featured-practitioners/featured-practitioners-admin.module';
import { PractitionerApplicationsAdminModule } from './practitioner-applications/practitioner-applications-admin.module';
import { AdminUsersAdminModule } from './users/admin-users-admin.module';

/**
 * Admin Module entry-point.
 * In Phase 1, it only exposes practitioner application review/decision APIs.
 */
@Module({
  imports: [
    PractitionerApplicationsAdminModule,
    AdminUsersAdminModule,
    FeaturedPractitionersAdminModule,
  ],
})
export class AdminModule {}
