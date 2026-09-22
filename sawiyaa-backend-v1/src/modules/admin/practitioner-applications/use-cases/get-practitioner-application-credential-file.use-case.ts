import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminPractitionerApplicationRepository } from '../repositories/admin-practitioner-application.repository';
import { AdminPractitionerCredentialRepository } from '../repositories/admin-practitioner-credential.repository';
import { PractitionerCredentialStorageService } from '@modules/practitioners/services/practitioner-credential-storage.service';

@Injectable()
export class GetPractitionerApplicationCredentialFileUseCase {
  constructor(
    private readonly applicationRepository: AdminPractitionerApplicationRepository,
    private readonly credentialRepository: AdminPractitionerCredentialRepository,
    private readonly credentialStorage: PractitionerCredentialStorageService,
  ) {}

  async execute(input: {
    applicationId: string;
    credentialId: string;
  }) {
    const application = await this.applicationRepository.findById(
      input.applicationId,
    );

    if (!application) {
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.applicationNotFound',
        error: 'ADMIN_PRACTITIONER_APPLICATION_NOT_FOUND',
      });
    }

    const credential = await this.credentialRepository.findById(
      input.credentialId,
    );
    const credentialOwned = application.practitionerId
      ? credential?.practitionerId === application.practitionerId
      : credential?.applicationId === application.id;
    if (!credential || !credentialOwned) {
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.credentialNotFound',
        error: 'ADMIN_PRACTITIONER_CREDENTIAL_NOT_FOUND',
      });
    }

    const stored = credential.storedFileId
      ? await this.credentialStorage.resolveStoredFile(credential.storedFileId)
      : null;
    const absolutePath =
      stored?.absolutePath ?? this.credentialStorage.resolveAbsolutePathFromFileUrl(credential.fileUrl);
    if (!absolutePath) {
      throw new NotFoundException({
        messageKey:
          'admin.practitionerApplications.errors.credentialFileNotFound',
        error: 'ADMIN_PRACTITIONER_CREDENTIAL_FILE_URL_INVALID',
      });
    }

    const stat = await this.credentialStorage.statSafeFile(absolutePath);
    if (!stat) {
      throw new NotFoundException({
        messageKey:
          'admin.practitionerApplications.errors.credentialFileNotFound',
        error: 'ADMIN_PRACTITIONER_CREDENTIAL_FILE_NOT_FOUND',
      });
    }

    const mimeType =
      stored?.mimeType ?? this.credentialStorage.guessMimeTypeFromAbsolutePath(absolutePath) ??
      'application/octet-stream';

    return { absolutePath, mimeType };
  }
}
