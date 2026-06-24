import { ConflictException, Injectable } from '@nestjs/common';
import { CredentialType } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { CreatePractitionerProfileUseCase } from './create-practitioner-profile.use-case';
import { PractitionerCredentialMapper } from '../mappers/practitioner-credential.mapper';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';

/**
 * Upload credential metadata stores baseline practitioner credential references.
 * This flow intentionally avoids file storage provider concerns in Phase 1.
 */
@Injectable()
export class UploadPractitionerCredentialMetadataUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly createPractitionerProfileUseCase: CreatePractitionerProfileUseCase,
    private readonly practitionerCredentialRepository: PractitionerCredentialRepository,
    private readonly practitionerCredentialMapper: PractitionerCredentialMapper,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    credentialType: CredentialType;
    fileUrl: string;
    expiresAt?: Date | null;
  }) {
    const profile = await this.createPractitionerProfileUseCase.execute(
      input.userId,
    );

    const existing =
      await this.practitionerCredentialRepository.findExistingByTypeAndFileUrl({
        practitionerId: profile.id,
        credentialType: input.credentialType,
        fileUrl: input.fileUrl,
      });

    if (existing) {
      throw new ConflictException({
        messageKey: 'practitioners.errors.credentialAlreadyExists',
        error: 'PRACTITIONER_CREDENTIAL_ALREADY_EXISTS',
      });
    }

    const credential = await this.practitionerCredentialRepository.create({
      practitionerId: profile.id,
      credentialType: input.credentialType,
      fileUrl: input.fileUrl,
      expiresAt: input.expiresAt,
    });

    return {
      message: this.i18nService.t(
        'practitioners.success.credentialUploaded',
        input.locale,
      ),
      credential: this.practitionerCredentialMapper.toViewModel(credential),
    };
  }
}
