import { Injectable, NotFoundException } from '@nestjs/common';
import { UserAvatarStorageService } from '../services/user-avatar-storage.service';

@Injectable()
export class GetCurrentUserAvatarFileUseCase {
  constructor(private readonly userAvatarStorageService: UserAvatarStorageService) {}

  async execute(input: { userId: string }) {
    const stored = await this.userAvatarStorageService.getAvatarFile(input.userId);
    if (!stored) {
      throw new NotFoundException({
        messageKey: 'users.errors.avatarNotFound',
        error: 'USER_AVATAR_NOT_FOUND',
      });
    }

    return stored;
  }
}

