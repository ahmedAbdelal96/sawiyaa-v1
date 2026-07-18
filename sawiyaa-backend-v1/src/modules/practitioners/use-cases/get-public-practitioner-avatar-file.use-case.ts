import { Injectable, NotFoundException } from '@nestjs/common';
import { PublicPractitionerReadRepository } from '../repositories/public-practitioner-read.repository';
import { PractitionerAvatarStorageService } from '../services/practitioner-avatar-storage.service';

@Injectable()
export class GetPublicPractitionerAvatarFileUseCase {
  constructor(
    private readonly publicReadRepository: PublicPractitionerReadRepository,
    private readonly avatarStorage: PractitionerAvatarStorageService,
  ) {}

  async execute(slug: string) {
    const profile = await this.publicReadRepository.findPublicAvatarSource(slug);
    if (!profile) {
      throw new NotFoundException({
        error: 'PUBLIC_PRACTITIONER_NOT_FOUND',
      });
    }

    const avatar = await this.avatarStorage.getAvatarFile(profile.userId);
    if (!avatar) {
      throw new NotFoundException({
        error: 'PUBLIC_PRACTITIONER_AVATAR_NOT_FOUND',
      });
    }

    return avatar;
  }
}
