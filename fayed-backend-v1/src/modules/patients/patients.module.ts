import { Module } from '@nestjs/common';
import { ActiveAccountGuard } from '@common/guards/account-state/active-account.guard';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PatientProfileController } from './controllers/patient-profile.controller';
import { PatientProfileMapper } from './mappers/patient-profile.mapper';
import { PatientOnboardingPolicy } from './policies/patient-onboarding.policy';
import { CountryRepository } from './repositories/country.repository';
import { PatientProfileRepository } from './repositories/patient-profile.repository';
import { PatientUserRepository } from './repositories/patient-user.repository';
import { PatientAvatarStorageService } from './services/patient-avatar-storage.service';
import { CompletePatientOnboardingUseCase } from './use-cases/complete-patient-onboarding.use-case';
import { CreatePatientProfileUseCase } from './use-cases/create-patient-profile.use-case';
import { GetPatientAvatarFileUseCase } from './use-cases/get-patient-avatar-file.use-case';
import { GetPatientProfileUseCase } from './use-cases/get-patient-profile.use-case';
import { RemovePatientAvatarUseCase } from './use-cases/remove-patient-avatar.use-case';
import { UpdatePatientAvatarUseCase } from './use-cases/update-patient-avatar.use-case';
import { UpdatePatientProfileUseCase } from './use-cases/update-patient-profile.use-case';

/**
 * Patients Module owns the current patient's baseline profile surface only.
 * It depends on shared auth guards and i18n infrastructure, but it does not absorb broader user or auth responsibilities.
 */
@Module({
  controllers: [PatientProfileController],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    ActiveAccountGuard,
    PatientProfileMapper,
    PatientOnboardingPolicy,
    PatientProfileRepository,
    PatientUserRepository,
    CountryRepository,
    PatientAvatarStorageService,
    CreatePatientProfileUseCase,
    GetPatientProfileUseCase,
    GetPatientAvatarFileUseCase,
    UpdatePatientAvatarUseCase,
    RemovePatientAvatarUseCase,
    UpdatePatientProfileUseCase,
    CompletePatientOnboardingUseCase,
  ],
  exports: [PatientProfileRepository],
})
export class PatientsModule {}
