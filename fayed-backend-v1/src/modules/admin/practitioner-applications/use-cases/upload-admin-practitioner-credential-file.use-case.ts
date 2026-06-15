import { BadRequestException, Injectable } from '@nestjs/common';
import { CredentialType } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerCredentialStorageService } from '@modules/practitioners/services/practitioner-credential-storage.service';

type UploadedCredentialFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

const MAX_CREDENTIAL_FILE_BYTES = 5 * 1024 * 1024;
const DIRECT_CREATE_UPLOAD_SCOPE = 'admin-direct-create';

@Injectable()
export class UploadAdminPractitionerCredentialFileUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly practitionerCredentialStorageService: PractitionerCredentialStorageService,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    credentialType: CredentialType;
    expiresAt?: Date | null;
    file?: UploadedCredentialFile;
  }) {
    if (!input.file || !input.file.buffer || input.file.size <= 0) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.credentialFileRequired',
        error: 'PRACTITIONER_CREDENTIAL_FILE_REQUIRED',
      });
    }

    if (
      !this.practitionerCredentialStorageService.isAllowedMimeType(
        input.file.mimetype,
      )
    ) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.credentialInvalidType',
        error: 'PRACTITIONER_CREDENTIAL_INVALID_TYPE',
      });
    }

    if (input.file.size > MAX_CREDENTIAL_FILE_BYTES) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.credentialFileTooLarge',
        error: 'PRACTITIONER_CREDENTIAL_FILE_TOO_LARGE',
      });
    }

    const stored =
      await this.practitionerCredentialStorageService.saveCredentialFile({
        practitionerProfileId: DIRECT_CREATE_UPLOAD_SCOPE,
        mimeType: input.file.mimetype,
        fileBuffer: input.file.buffer,
      });

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.credentialPrepared',
        input.locale,
      ),
      credential: {
        credentialType: input.credentialType,
        fileUrl: stored.fileUrl,
        expiresAt: input.expiresAt ?? null,
        sizeBytes: stored.sizeBytes,
      },
    };
  }
}
