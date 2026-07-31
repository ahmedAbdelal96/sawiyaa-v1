import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerCredentialStorageService } from '../services/practitioner-credential-storage.service';

@Injectable()
export class GetPractitionerCredentialFileUseCase {
  constructor(
    private readonly profileRepository: PractitionerProfileRepository,
    private readonly credentialRepository: PractitionerCredentialRepository,
    private readonly storageService: PractitionerCredentialStorageService,
  ) {}

  async execute(input: { userId: string; credentialId: string }) {
    const profile = await this.profileRepository.findByUserId(input.userId);
    const credential = profile
      ? await this.credentialRepository.findByIdForPractitioner(input.credentialId, profile.id)
      : null;
    if (!credential) {
      throw new NotFoundException({ error: 'PRACTITIONER_CREDENTIAL_NOT_FOUND' });
    }

    const absolutePath = this.storageService.resolveAbsolutePathFromFileUrl(credential.fileUrl);
    const stat = absolutePath ? await fs.stat(absolutePath).catch(() => null) : null;
    if (!absolutePath || !stat?.isFile()) {
      throw new NotFoundException({ error: 'PRACTITIONER_CREDENTIAL_FILE_NOT_FOUND' });
    }

    return {
      absolutePath,
      mimeType: this.storageService.guessMimeTypeFromAbsolutePath(absolutePath) ?? 'application/octet-stream',
    };
  }
}
