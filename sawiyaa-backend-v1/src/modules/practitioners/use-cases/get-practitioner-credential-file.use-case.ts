import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerCredentialStorageService } from '../services/practitioner-credential-storage.service';
import { PractitionerApplicationRepository } from '../repositories/practitioner-application.repository';

@Injectable()
export class GetPractitionerCredentialFileUseCase {
  constructor(
    private readonly profileRepository: PractitionerProfileRepository,
    private readonly credentialRepository: PractitionerCredentialRepository,
    private readonly storageService: PractitionerCredentialStorageService,
    private readonly applicationRepository: PractitionerApplicationRepository,
  ) {}

  async execute(input: { userId: string; credentialId: string }) {
    const profile = await this.profileRepository.findByUserId(input.userId);
    const application = profile
      ? null
      : await this.applicationRepository.findLatestByUserId(input.userId);
    const credential = profile
      ? await this.credentialRepository.findByIdForPractitioner(input.credentialId, profile.id)
      : application
        ? await this.credentialRepository.findByIdForApplication(input.credentialId, application.id)
        : null;
    if (!credential) {
      throw new NotFoundException({ error: 'PRACTITIONER_CREDENTIAL_NOT_FOUND' });
    }

    const stored = credential.storedFileId
      ? await this.storageService.resolveStoredFile(credential.storedFileId)
      : null;
    const absolutePath = stored?.absolutePath ?? this.storageService.resolveAbsolutePathFromFileUrl(credential.fileUrl);
    const stat = absolutePath ? await fs.stat(absolutePath).catch(() => null) : null;
    if (!absolutePath || !stat?.isFile()) {
      throw new NotFoundException({ error: 'PRACTITIONER_CREDENTIAL_FILE_NOT_FOUND' });
    }

    return {
      absolutePath,
      mimeType: stored?.mimeType ?? this.storageService.guessMimeTypeFromAbsolutePath(absolutePath) ?? 'application/octet-stream',
    };
  }
}
