import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PatientProfileRepository } from '../repositories/patient-profile.repository';
import { PatientAvatarStorageService } from '../services/patient-avatar-storage.service';

@Injectable()
export class RemovePatientAvatarUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly patientAvatarStorageService: PatientAvatarStorageService,
  ) {}

  async execute(input: { userId: string; locale: SupportedLocale }) {
    const profile = await this.patientProfileRepository.findByUserId(
      input.userId,
    );

    if (!profile) {
      throw new NotFoundException({
        messageKey: 'patients.errors.profileNotFound',
        error: 'PATIENT_PROFILE_NOT_FOUND',
      });
    }

    await this.patientAvatarStorageService.deleteAvatar(profile.id);

    return {
      message: this.i18nService.t(
        'patients.success.avatarRemoved',
        input.locale,
      ),
      avatar: {
        patientProfileId: profile.id,
        avatarUrl: null,
      },
    };
  }
}
