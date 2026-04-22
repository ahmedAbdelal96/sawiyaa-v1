import { BadRequestException, Injectable } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { UserAvatarStorageService } from '../services/user-avatar-storage.service';

type UploadedAvatarFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

// Keep avatars small because /users/me embeds the avatar as a data URL for reliable rendering.
const MAX_USER_AVATAR_BYTES = 512 * 1024;

@Injectable()
export class UpdateCurrentUserAvatarUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly userAvatarStorageService: UserAvatarStorageService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    file?: UploadedAvatarFile;
  }) {
    if (!input.file) {
      throw new BadRequestException({
        messageKey: 'users.errors.avatarFileRequired',
        error: 'USER_AVATAR_FILE_REQUIRED',
      });
    }

    if (!this.userAvatarStorageService.isAllowedMimeType(input.file.mimetype)) {
      throw new BadRequestException({
        messageKey: 'users.errors.avatarInvalidType',
        error: 'USER_AVATAR_INVALID_TYPE',
      });
    }

    if (input.file.size > MAX_USER_AVATAR_BYTES) {
      throw new BadRequestException({
        messageKey: 'users.errors.avatarFileTooLarge',
        error: 'USER_AVATAR_FILE_TOO_LARGE',
      });
    }

    const stored = await this.userAvatarStorageService.saveAvatar({
      userId: input.userId,
      fileBuffer: input.file.buffer,
      mimeType: input.file.mimetype,
    });

    return {
      message: this.i18nService.t('users.success.avatarUpdated', input.locale),
      avatar: {
        userId: input.userId,
        avatarUrl: stored.avatarUrl,
      },
    };
  }
}
