import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PatientProfileMapper } from '../mappers/patient-profile.mapper';
import { PatientProfileRepository } from '../repositories/patient-profile.repository';
import { PatientUserRepository } from '../repositories/patient-user.repository';
import { PatientAvatarStorageService } from '../services/patient-avatar-storage.service';

/**
 * Current patient profile read resolves from both PatientProfile and lightweight User preferences.
 * This read path is intentionally side-effect free: GET should not silently create or mutate profile state.
 */
@Injectable()
export class GetPatientProfileUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly patientUserRepository: PatientUserRepository,
    private readonly patientProfileMapper: PatientProfileMapper,
    private readonly patientAvatarStorageService: PatientAvatarStorageService,
  ) {}

  async execute(input: { userId: string; locale: SupportedLocale }) {
    const [profile, user] = await Promise.all([
      this.patientProfileRepository.findByUserId(input.userId),
      this.patientUserRepository.findProfileSeed(input.userId),
    ]);

    if (!profile || !user) {
      throw new NotFoundException({
        messageKey: 'patients.errors.profileNotFound',
        error: 'PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const [avatarMetadata, avatarDataUrl] = await Promise.all([
      this.patientAvatarStorageService.resolveAvatarMetadata(profile.id),
      this.patientAvatarStorageService.resolveAvatarDataUrl(profile.id),
    ]);

    return {
      message: this.i18nService.t(
        'patients.success.profileFetched',
        input.locale,
      ),
      profile: this.patientProfileMapper.toViewModel({
        profile,
        user,
        avatarUrl: avatarMetadata?.avatarUrl ?? null,
        avatarDataUrl,
      }),
    };
  }
}
