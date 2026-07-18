import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminPractitionerProfileRepository } from '../repositories/admin-practitioner-profile.repository';
import { PractitionerAvatarStorageService } from '@modules/practitioners/services/practitioner-avatar-storage.service';

@Injectable()
export class GetAdminPractitionerAvatarFileUseCase {
  constructor(
    private readonly profileRepository: AdminPractitionerProfileRepository,
    private readonly avatarStorage: PractitionerAvatarStorageService,
  ) {}

  async execute(practitionerId: string) {
    const profile = await this.profileRepository.findById(practitionerId);
    if (!profile) {
      throw new NotFoundException({ error: 'ADMIN_PRACTITIONER_NOT_FOUND' });
    }

    const avatar = await this.avatarStorage.getAvatarFile(profile.userId);
    if (!avatar) {
      throw new NotFoundException({ error: 'ADMIN_PRACTITIONER_AVATAR_NOT_FOUND' });
    }

    return avatar;
  }
}
