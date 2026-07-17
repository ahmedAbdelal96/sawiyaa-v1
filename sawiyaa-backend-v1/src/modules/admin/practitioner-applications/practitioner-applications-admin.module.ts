import { Module } from '@nestjs/common';
import { ActiveAccountGuard } from '@common/guards/account-state/active-account.guard';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminPractitionersController } from './controllers/admin-practitioners.controller';
import { PractitionerApplicationsAdminController } from './controllers/practitioner-applications-admin.controller';
import { PractitionerApplicationsAdminMapper } from './mappers/practitioner-applications-admin.mapper';
import { PractitionerApplicationReviewPolicy } from './policies/practitioner-application-review.policy';
import { PractitionerApplicationTransitionPolicy } from './policies/practitioner-application-transition.policy';
import { AdminNotificationRepository } from './repositories/admin-notification.repository';
import { AdminPractitionerApplicationRepository } from './repositories/admin-practitioner-application.repository';
import { AdminPractitionerCredentialRepository } from './repositories/admin-practitioner-credential.repository';
import { AdminPractitionerDirectoryRepository } from './repositories/admin-practitioner-directory.repository';
import { AdminPractitionerProfileRepository } from './repositories/admin-practitioner-profile.repository';
import { AdminPractitionerSpecialtyRepository } from './repositories/admin-practitioner-specialty.repository';
import { AdminSpecialtyRepository } from './repositories/admin-specialty.repository';
import { AdminUserRepository } from './repositories/admin-user.repository';
import { AdminPractitionerApplicationNotificationService } from './services/admin-practitioner-application-notification.service';
import { PractitionerApplicationSnapshotService } from '@modules/practitioners/services/practitioner-application-snapshot.service';
import { PractitionerApplicationCompletionService } from '@modules/practitioners/services/practitioner-application-completion.service';
import { PractitionerPayoutDestinationValidationService } from '@modules/practitioners/services/practitioner-payout-destination-validation.service';
import { PractitionerSpecialtyIntegrityService } from '@modules/practitioners/services/practitioner-specialty-integrity.service';
import { ApprovePractitionerApplicationUseCase } from './use-cases/approve-practitioner-application.use-case';
import { CreateAdminPractitionerUseCase } from './use-cases/create-admin-practitioner.use-case';
import { DeletePractitionerApplicationCredentialUseCase } from './use-cases/delete-practitioner-application-credential.use-case';
import { GetPractitionerApplicationDetailsUseCase } from './use-cases/get-practitioner-application-details.use-case';
import { ListAdminPractitionersDirectoryUseCase } from './use-cases/list-admin-practitioners-directory.use-case';
import { ListPractitionerApplicationsUseCase } from './use-cases/list-practitioner-applications.use-case';
import { RemoveAdminPractitionerAvatarUseCase } from './use-cases/remove-admin-practitioner-avatar.use-case';
import { RejectPractitionerApplicationUseCase } from './use-cases/reject-practitioner-application.use-case';
import { RequestPractitionerApplicationChangesUseCase } from './use-cases/request-practitioner-application-changes.use-case';
import { UpsertPractitionerApplicationCredentialUseCase } from './use-cases/upsert-practitioner-application-credential.use-case';
import { UpdateAdminPractitionerAvatarUseCase } from './use-cases/update-admin-practitioner-avatar.use-case';
import { UpdatePractitionerApplicationDraftUseCase } from './use-cases/update-practitioner-application-draft.use-case';
import { GetPractitionerApplicationAvatarFileUseCase } from './use-cases/get-practitioner-application-avatar-file.use-case';
import { GetPractitionerApplicationCredentialFileUseCase } from './use-cases/get-practitioner-application-credential-file.use-case';
import { UploadAdminPractitionerCredentialFileUseCase } from './use-cases/upload-admin-practitioner-credential-file.use-case';
import { PractitionerAvatarStorageService } from '@modules/practitioners/services/practitioner-avatar-storage.service';
import { PractitionerCredentialStorageService } from '@modules/practitioners/services/practitioner-credential-storage.service';
import { ReviewsModule } from '@modules/reviews/reviews.module';
import { AuthModule } from '@modules/auth/auth.module';
import { ClearPractitionerAuthLockoutUseCase } from './use-cases/clear-practitioner-auth-lockout.use-case';

/**
 * This sub-module isolates admin-only practitioner review/application-management concerns.
 * It intentionally does not expose practitioner self-service profile/update flows.
 */
@Module({
  imports: [ReviewsModule, AuthModule],
  controllers: [
    PractitionerApplicationsAdminController,
    AdminPractitionersController,
  ],
  providers: [
    JwtAccessAuthGuard,
    AdminGuard,
    RolesGuard,
    PermissionsGuard,
    PermissionResolverService,
    ActiveAccountGuard,
    PractitionerApplicationsAdminMapper,
    PractitionerApplicationReviewPolicy,
    PractitionerApplicationTransitionPolicy,
    AdminPractitionerApplicationRepository,
    AdminPractitionerDirectoryRepository,
    AdminPractitionerProfileRepository,
    AdminPractitionerCredentialRepository,
    AdminPractitionerSpecialtyRepository,
    AdminSpecialtyRepository,
    AdminUserRepository,
    AdminNotificationRepository,
    AdminPractitionerApplicationNotificationService,
    PractitionerSpecialtyIntegrityService,
    PractitionerPayoutDestinationValidationService,
    PractitionerApplicationSnapshotService,
    PractitionerApplicationCompletionService,
    PractitionerAvatarStorageService,
    PractitionerCredentialStorageService,
    ListPractitionerApplicationsUseCase,
    ListAdminPractitionersDirectoryUseCase,
    UpdateAdminPractitionerAvatarUseCase,
    RemoveAdminPractitionerAvatarUseCase,
    ClearPractitionerAuthLockoutUseCase,
    GetPractitionerApplicationDetailsUseCase,
    GetPractitionerApplicationAvatarFileUseCase,
    GetPractitionerApplicationCredentialFileUseCase,
    UploadAdminPractitionerCredentialFileUseCase,
    CreateAdminPractitionerUseCase,
    UpdatePractitionerApplicationDraftUseCase,
    UpsertPractitionerApplicationCredentialUseCase,
    DeletePractitionerApplicationCredentialUseCase,
    ApprovePractitionerApplicationUseCase,
    RejectPractitionerApplicationUseCase,
    RequestPractitionerApplicationChangesUseCase,
  ],
})
export class PractitionerApplicationsAdminModule {}
