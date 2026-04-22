import { Injectable } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { UserAvatarStorageService } from '../services/user-avatar-storage.service';

@Injectable()
export class RemoveCurrentUserAvatarUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly userAvatarStorageService: UserAvatarStorageService,
  ) {}

  async execute(input: { userId: string; locale: SupportedLocale }) {
    await this.userAvatarStorageService.deleteAvatar(input.userId);

    return {
      message: this.i18nService.t('users.success.avatarRemoved', input.locale),
      avatar: {
        userId: input.userId,
        avatarUrl: null,
      },
    };
  }
}
