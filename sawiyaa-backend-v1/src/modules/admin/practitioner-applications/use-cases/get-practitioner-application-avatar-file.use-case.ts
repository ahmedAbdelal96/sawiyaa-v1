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

    // Avatar storage is keyed by the owning user id (same id used by practitioner self-service endpoints).
    const practitionerUserId = application.practitioner.userId;
    const stored = await this.avatarStorage.getAvatarFile(practitionerUserId);
    if (!stored) {
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.avatarNotFound',
        error: 'ADMIN_PRACTITIONER_AVATAR_NOT_FOUND',
      });
    }

    return stored;
  }
}
