import { Module } from '@nestjs/common';
import { ActiveAccountGuard } from '@common/guards/account-state/active-account.guard';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PractitionerOtpVerifiedGuard } from '@common/guards/practitioner/practitioner-otp-verified.guard';
import { ConfigModule } from '@modules/config/config.module';
import { PatientsModule } from '@modules/patients/patients.module';
import { PublicPractitionerController } from './controllers/public-practitioner.controller';
import { PractitionerProfileController } from './controllers/practitioner-profile.controller';
import { PublicPractitionerMapper } from './mappers/public-practitioner.mapper';
import { PractitionerApplicationMapper } from './mappers/practitioner-application.mapper';
import { PractitionerCredentialMapper } from './mappers/practitioner-credential.mapper';
import { PractitionerProfileMapper } from './mappers/practitioner-profile.mapper';
import { PublicPractitionerVisibilityPolicy } from './policies/public-practitioner-visibility.policy';
import { PractitionerApplicationEligibilityPolicy } from './policies/practitioner-application-eligibility.policy';
import { PractitionerProfileReadinessPolicy } from './policies/practitioner-profile-readiness.policy';
import { CountryRepository } from './repositories/country.repository';
import { LanguageRepository } from './repositories/language.repository';
import { PractitionerApplicationRepository } from './repositories/practitioner-application.repository';
import { PractitionerCredentialRepository } from './repositories/practitioner-credential.repository';
import { PractitionerLanguageRepository } from './repositories/practitioner-language.repository';
import { PractitionerPayoutDestinationRepository } from './repositories/practitioner-payout-destination.repository';
import { PractitionerProfileRepository } from './repositories/practitioner-profile.repository';
import { PractitionerSpecialtyRepository } from './repositories/practitioner-specialty.repository';
import { PractitionerUserRepository } from './repositories/practitioner-user.repository';
import { PublicPractitionerReadRepository } from './repositories/public-practitioner-read.repository';
import { SpecialtyRepository } from './repositories/specialty.repository';
import { PractitionerApplicationSnapshotService } from './services/practitioner-application-snapshot.service';
import { PractitionerApplicationCompletionService } from './services/practitioner-application-completion.service';
import { PractitionerAvatarStorageService } from './services/practitioner-avatar-storage.service';
import { PractitionerCredentialStorageService } from './services/practitioner-credential-storage.service';
import { PractitionerPayoutDestinationValidationService } from './services/practitioner-payout-destination-validation.service';
import { PractitionerSpecialtyIntegrityService } from './services/practitioner-specialty-integrity.service';
import { CreatePractitionerProfileUseCase } from './use-cases/create-practitioner-profile.use-case';
import { GetPublicPractitionerDetailsUseCase } from './use-cases/get-public-practitioner-details.use-case';
import { GetPractitionerApplicationStatusUseCase } from './use-cases/get-practitioner-application-status.use-case';
import { GetPractitionerProfileReadinessUseCase } from './use-cases/get-practitioner-profile-readiness.use-case';
import { GetPractitionerProfileUseCase } from './use-cases/get-practitioner-profile.use-case';
import { ListPublicPractitionersUseCase } from './use-cases/list-public-practitioners.use-case';
import { ListPractitionerCredentialsUseCase } from './use-cases/list-practitioner-credentials.use-case';
import { ListPractitionerSpecialtiesUseCase } from './use-cases/list-practitioner-specialties.use-case';
import { SetPractitionerSpecialtiesUseCase } from './use-cases/set-practitioner-specialties.use-case';
import { SubmitPractitionerApplicationUseCase } from './use-cases/submit-practitioner-application.use-case';
import { UpdatePractitionerProfileUseCase } from './use-cases/update-practitioner-profile.use-case';
import { RemovePractitionerAvatarUseCase } from './use-cases/remove-practitioner-avatar.use-case';
import { UpdatePractitionerAvatarUseCase } from './use-cases/update-practitioner-avatar.use-case';
import { UploadPractitionerCredentialMetadataUseCase } from './use-cases/upload-practitioner-credential-metadata.use-case';
import { UploadPractitionerCredentialFileUseCase } from './use-cases/upload-practitioner-credential-file.use-case';

/**
 * Practitioners Module owns practitioner baseline profile/readiness/specialties/credentials/application self-submission.
 * It does not include auth flows, admin review workflows, or session/payment concerns.
 */
@Module({
  imports: [ConfigModule, PatientsModule],
  controllers: [PractitionerProfileController, PublicPractitionerController],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    ActiveAccountGuard,
    PractitionerOtpVerifiedGuard,
    PractitionerProfileMapper,
    PractitionerCredentialMapper,
    PractitionerApplicationMapper,
    PublicPractitionerMapper,
    PractitionerProfileReadinessPolicy,
    PractitionerApplicationEligibilityPolicy,
    PublicPractitionerVisibilityPolicy,
    PractitionerProfileRepository,
    PractitionerSpecialtyRepository,
    SpecialtyRepository,
    PublicPractitionerReadRepository,
    PractitionerCredentialRepository,
    PractitionerApplicationRepository,
    PractitionerUserRepository,
    PractitionerPayoutDestinationRepository,
    CountryRepository,
    LanguageRepository,
    PractitionerLanguageRepository,
    PractitionerSpecialtyIntegrityService,
    PractitionerPayoutDestinationValidationService,
    PractitionerApplicationSnapshotService,
    PractitionerApplicationCompletionService,
    PractitionerAvatarStorageService,
    PractitionerCredentialStorageService,
    CreatePractitionerProfileUseCase,
    GetPractitionerProfileUseCase,
    UpdatePractitionerProfileUseCase,
    UpdatePractitionerAvatarUseCase,
    RemovePractitionerAvatarUseCase,
    SetPractitionerSpecialtiesUseCase,
    ListPractitionerSpecialtiesUseCase,
    UploadPractitionerCredentialMetadataUseCase,
    UploadPractitionerCredentialFileUseCase,
    ListPractitionerCredentialsUseCase,
    SubmitPractitionerApplicationUseCase,
    GetPractitionerApplicationStatusUseCase,
    GetPractitionerProfileReadinessUseCase,
    ListPublicPractitionersUseCase,
    GetPublicPractitionerDetailsUseCase,
  ],
  exports: [
    PublicPractitionerReadRepository,
    PublicPractitionerVisibilityPolicy,
    PublicPractitionerMapper,
  ],
})
export class PractitionersModule {}
