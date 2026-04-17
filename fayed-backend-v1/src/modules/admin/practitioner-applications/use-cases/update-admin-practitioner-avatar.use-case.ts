import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AdminPractitionerProfileRepository } from '../repositories/admin-practitioner-profile.repository';

@Injectable()
export class UpdateAdminPractitionerAvatarUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly profileRepository: AdminPractitionerProfileRepository,
  ) {}

  async execute(input: {
    practitionerId: string;
    locale: SupportedLocale;
    avatarUrl: string;
  }) {
    let updated: { id: string; avatarUrl: string | null };
    try {
      updated = await this.profileRepository.updateAvatar(
        input.practitionerId,
        input.avatarUrl,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException({
          messageKey:
            'admin.practitionerApplications.errors.practitionerNotFound',
          error: 'ADMIN_PRACTITIONER_NOT_FOUND',
        });
      }
      throw error;
    }

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.practitionerAvatarUpdated',
        input.locale,
      ),
      avatar: {
        practitionerProfileId: updated.id,
        avatarUrl: updated.avatarUrl ?? null,
      },
    };
  }
}

