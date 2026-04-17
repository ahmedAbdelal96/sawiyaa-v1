import { BadRequestException, Injectable } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { CreatePatientProfileUseCase } from './create-patient-profile.use-case';
import { PatientAvatarStorageService } from '../services/patient-avatar-storage.service';

type UploadedAvatarFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

const MAX_PATIENT_AVATAR_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UpdatePatientAvatarUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly createPatientProfileUseCase: CreatePatientProfileUseCase,
    private readonly patientAvatarStorageService: PatientAvatarStorageService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    file?: UploadedAvatarFile;
  }) {
    if (!input.file) {
      throw new BadRequestException({
        messageKey: 'patients.errors.avatarFileRequired',
        error: 'PATIENT_AVATAR_FILE_REQUIRED',
      });
    }

    if (
      !this.patientAvatarStorageService.isAllowedMimeType(input.file.mimetype)
    ) {
      throw new BadRequestException({
        messageKey: 'patients.errors.avatarInvalidType',
        error: 'PATIENT_AVATAR_INVALID_TYPE',
      });
    }

    if (input.file.size > MAX_PATIENT_AVATAR_BYTES) {
      throw new BadRequestException({
        messageKey: 'patients.errors.avatarFileTooLarge',
        error: 'PATIENT_AVATAR_FILE_TOO_LARGE',
      });
    }

    const profile = await this.createPatientProfileUseCase.execute(
      input.userId,
    );

    const stored = await this.patientAvatarStorageService.saveAvatar({
      patientProfileId: profile.id,
      fileBuffer: input.file.buffer,
      mimeType: input.file.mimetype,
    });

    return {
      message: this.i18nService.t(
        'patients.success.avatarUpdated',
        input.locale,
      ),
      avatar: {
        patientProfileId: profile.id,
        avatarUrl: stored.avatarUrl,
      },
    };
  }
}
