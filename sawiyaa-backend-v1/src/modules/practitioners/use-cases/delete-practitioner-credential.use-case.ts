import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PractitionerApplicationStatus, PractitionerStatus } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerApplicationRepository } from '../repositories/practitioner-application.repository';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerCredentialStorageService } from '../services/practitioner-credential-storage.service';

@Injectable()
export class DeletePractitionerCredentialUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly profileRepository: PractitionerProfileRepository,
    private readonly applicationRepository: PractitionerApplicationRepository,
    private readonly credentialRepository: PractitionerCredentialRepository,
    private readonly storageService: PractitionerCredentialStorageService,
  ) {}

  async execute(input: { userId: string; credentialId: string; locale: SupportedLocale }) {
    const profile = await this.profileRepository.findByUserId(input.userId);
    if (!profile) {
      throw new NotFoundException({ error: 'PRACTITIONER_PROFILE_NOT_FOUND' });
    }

    const application = await this.applicationRepository.findLatestByPractitionerId(profile.id);
    const lockedStatuses: PractitionerApplicationStatus[] = [
      PractitionerApplicationStatus.SUBMITTED,
      PractitionerApplicationStatus.UNDER_REVIEW,
      PractitionerApplicationStatus.APPROVED,
      PractitionerApplicationStatus.ARCHIVED,
    ];
    const locked = application?.status !== undefined && lockedStatuses.includes(application.status);
    const editableStatuses: PractitionerStatus[] = [PractitionerStatus.DRAFT, PractitionerStatus.REJECTED];
    if (locked || !editableStatuses.includes(profile.status)) {
      throw new ConflictException({
        error: 'PRACTITIONER_CREDENTIALS_LOCKED_AFTER_SUBMISSION',
        messageKey: 'practitioners.errors.credentialsLocked',
      });
    }

    const credential = await this.credentialRepository.findByIdForPractitioner(
      input.credentialId,
      profile.id,
    );
    if (!credential) {
      throw new NotFoundException({ error: 'PRACTITIONER_CREDENTIAL_NOT_FOUND' });
    }

    await this.credentialRepository.deleteById(credential.id);
    await this.storageService.deleteCredential(credential.fileUrl);
    return {
      message: this.i18nService.t('practitioners.success.credentialDeleted', input.locale),
      credentialId: credential.id,
    };
  }
}
