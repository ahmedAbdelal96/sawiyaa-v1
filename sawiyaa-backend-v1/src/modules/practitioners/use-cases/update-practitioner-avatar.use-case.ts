import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerAvatarStorageService } from '../services/practitioner-avatar-storage.service';

type UploadedAvatarFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

const MAX_PRACTITIONER_AVATAR_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UpdatePractitionerAvatarUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly practitionerProfileRepository: PractitionerProfileRepository,
    private readonly practitionerAvatarStorageService: PractitionerAvatarStorageService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    avatarUrl?: string | null;
    file?: UploadedAvatarFile;
  }) {
    if (!input.file && input.avatarUrl === undefined) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.avatarValueRequired',
        error: 'PRACTITIONER_AVATAR_VALUE_REQUIRED',
      });
    }

    if (input.file) {
      if (!this.practitionerAvatarStorageService.isAllowedMimeType(input.file.mimetype)) {
        throw new BadRequestException({
          messageKey: 'practitioners.errors.avatarInvalidType',
          error: 'PRACTITIONER_AVATAR_INVALID_TYPE',
        });
      }

      if (input.file.size <= 0) {
        throw new BadRequestException({
          messageKey: 'practitioners.errors.avatarFileRequired',
          error: 'PRACTITIONER_AVATAR_FILE_REQUIRED',
        });
      }

      if (input.file.size > MAX_PRACTITIONER_AVATAR_BYTES) {
        throw new BadRequestException({
          messageKey: 'practitioners.errors.avatarFileTooLarge',
          error: 'PRACTITIONER_AVATAR_FILE_TOO_LARGE',
        });
      }
    }

    let updated: { id: string; avatarUrl: string | null };
    try {
      if (input.file) {
        const stored = await this.practitionerAvatarStorageService.saveAvatar({
          practitionerProfileId: input.userId,
          fileBuffer: input.file.buffer,
          mimeType: input.file.mimetype,
        });
        updated = await this.practitionerProfileRepository.updateAvatarByUserId(
          input.userId,
          stored.avatarUrl,
        );
      } else {
        updated = await this.practitionerProfileRepository.updateAvatarByUserId(
          input.userId,
          input.avatarUrl ?? null,
        );
      }
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
