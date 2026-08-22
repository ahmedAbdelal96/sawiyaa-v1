import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { PractitionerCredentialStorageService } from '@modules/practitioners/services/practitioner-credential-storage.service';

@Injectable()
export class GetAdminDirectCreateCredentialFileUseCase {
  constructor(private readonly storageService: PractitionerCredentialStorageService) {}

  async execute(input: { credentialId: string; mimeType: string }) {
    const stored = await this.storageService.resolveDirectCreateCredentialFile(input.credentialId, input.mimeType);
    const absolutePath = stored?.absolutePath ?? null;
    const stat = absolutePath ? await fs.stat(absolutePath).catch(() => null) : null;
    if (!absolutePath || !stat?.isFile()) {
      throw new NotFoundException({ error: 'ADMIN_DIRECT_CREATE_CREDENTIAL_NOT_FOUND' });
    }

    return { absolutePath, mimeType: stored?.mimeType ?? input.mimeType };
  }
}
