import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminPractitionerApplicationRepository } from '../repositories/admin-practitioner-application.repository';
import { PractitionerAvatarStorageService } from '@modules/practitioners/services/practitioner-avatar-storage.service';

@Injectable()
export class GetPractitionerApplicationAvatarFileUseCase {
  constructor(
    private readonly applicationRepository: AdminPractitionerApplicationRepository,
    private readonly avatarStorage: PractitionerAvatarStorageService,
  ) {}

  async execute(input: { applicationId: string }) {
    const application = await this.applicationRepository.findById(
      input.applicationId,
    );

    if (!application) {
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.applicationNotFound',
        error: 'ADMIN_PRACTITIONER_APPLICATION_NOT_FOUND',
      });
    }

    const stored = await this.avatarStorage.getAvatarFile(application.practitioner.id);
    if (!stored) {
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.avatarNotFound',
        error: 'ADMIN_PRACTITIONER_AVATAR_NOT_FOUND',
      });
    }

    return stored;
  }
}
