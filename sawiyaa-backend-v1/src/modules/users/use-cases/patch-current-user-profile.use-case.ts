import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class PatchCurrentUserProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly i18nService: I18nService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    displayName?: string;
  }) {
    if (
      input.displayName !== undefined &&
      input.displayName.trim().length === 0
    ) {
      throw new BadRequestException({
        messageKey: 'users.errors.displayNameRequired',
        error: 'DISPLAY_NAME_REQUIRED',
      });
    }

    const updated = await this.userRepository.patchCurrentUserProfile({
      userId: input.userId,
      displayName: input.displayName,
    });

    if (!updated) {
      throw new NotFoundException({
        messageKey: 'users.errors.currentUserNotFound',
        error: 'CURRENT_USER_NOT_FOUND',
      });
    }

    return {
      message: this.i18nService.t('users.success.profileUpdated', input.locale),
      user: {
        userId: updated.id,
        displayName: updated.displayName,
      },
    };
  }
}
