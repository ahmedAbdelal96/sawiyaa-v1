import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerAvatarStorageService } from '../services/practitioner-avatar-storage.service';

@Injectable()
export class RemovePractitionerAvatarUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly practitionerProfileRepository: PractitionerProfileRepository,
    private readonly practitionerAvatarStorageService: PractitionerAvatarStorageService,
  ) {}

  async execute(input: { userId: string; locale: SupportedLocale }) {
    let updated: { id: string; avatarUrl: string | null };
    try {
      await this.practitionerAvatarStorageService.deleteAvatar(input.userId);
      updated = await this.practitionerProfileRepository.updateAvatarByUserId(
        input.userId,
        null,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException({
          messageKey: 'practitioners.errors.profileNotFound',
          error: 'PRACTITIONER_PROFILE_NOT_FOUND',
        });
      }
      throw error;
    }

    return {
      message: this.i18nService.t(
        'practitioners.success.avatarRemoved',
        input.locale,
      ),
      avatar: {
        practitionerProfileId: updated.id,
        avatarUrl: null,
      },
    };
  }
}
