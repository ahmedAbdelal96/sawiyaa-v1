import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminPractitionerApplicationRepository } from '../repositories/admin-practitioner-application.repository';
import { AdminPractitionerCredentialRepository } from '../repositories/admin-practitioner-credential.repository';
import { PractitionerCredentialStorageService } from '@modules/practitioners/services/practitioner-credential-storage.service';
import { promises as fs } from 'fs';

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
    if (!credential || credential.practitionerId !== application.practitionerId) {
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.credentialNotFound',
        error: 'ADMIN_PRACTITIONER_CREDENTIAL_NOT_FOUND',
      });
    }

    const absolutePath =
      this.credentialStorage.resolveAbsolutePathFromFileUrl(credential.fileUrl);
    if (!absolutePath) {
      throw new NotFoundException({
        messageKey:
          'admin.practitionerApplications.errors.credentialFileNotFound',
        error: 'ADMIN_PRACTITIONER_CREDENTIAL_FILE_URL_INVALID',
      });
    }

    const stat = await fs.stat(absolutePath).catch(() => null);
    if (!stat?.isFile()) {
      throw new NotFoundException({
        messageKey:
          'admin.practitionerApplications.errors.credentialFileNotFound',
        error: 'ADMIN_PRACTITIONER_CREDENTIAL_FILE_NOT_FOUND',
      });
    }

    const mimeType =
      this.credentialStorage.guessMimeTypeFromAbsolutePath(absolutePath) ??
      'application/octet-stream';

    return { absolutePath, mimeType };
  }
}
