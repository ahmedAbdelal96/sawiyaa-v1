import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientProfileRepository } from '../repositories/patient-profile.repository';
import { PatientAvatarStorageService } from '../services/patient-avatar-storage.service';

@Injectable()
export class GetPatientAvatarFileUseCase {
  constructor(
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly patientAvatarStorageService: PatientAvatarStorageService,
  ) {}

  async execute(input: { userId: string }) {
    const profile = await this.patientProfileRepository.findByUserId(
      input.userId,
    );
    if (!profile) {
      throw new NotFoundException({
        messageKey: 'patients.errors.profileNotFound',
        error: 'PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const stored = await this.patientAvatarStorageService.getAvatarFile(
      profile.id,
    );
    if (!stored) {
      throw new NotFoundException({
        messageKey: 'patients.errors.avatarNotFound',
        error: 'PATIENT_AVATAR_NOT_FOUND',
      });
    }

    return stored;
  }
}
