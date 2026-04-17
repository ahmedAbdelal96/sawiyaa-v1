import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';

@Injectable()
export class UpdatePractitionerAvatarUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly practitionerProfileRepository: PractitionerProfileRepository,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    avatarUrl: string;
  }) {
    let updated: { id: string; avatarUrl: string | null };
    try {
      updated = await this.practitionerProfileRepository.updateAvatarByUserId(
        input.userId,
        input.avatarUrl,
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
        'practitioners.success.avatarUpdated',
        input.locale,
      ),
      avatar: {
        practitionerProfileId: updated.id,
        avatarUrl: updated.avatarUrl ?? null,
      },
    };
  }
}
