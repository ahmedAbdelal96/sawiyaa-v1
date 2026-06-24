import { Injectable } from '@nestjs/common';
import { PractitionerCredentialViewModel } from '../types/practitioner.types';

/**
 * Mapper isolates credential metadata output shape from persistence details.
 */
@Injectable()
export class PractitionerCredentialMapper {
  toViewModel(input: {
    id: string;
    credentialType: PractitionerCredentialViewModel['credentialType'];
    fileUrl: string;
    reviewStatus: PractitionerCredentialViewModel['reviewStatus'];
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): PractitionerCredentialViewModel {
    return {
      credentialId: input.id,
      credentialType: input.credentialType,
      fileUrl: input.fileUrl,
      reviewStatus: input.reviewStatus,
      expiresAt: input.expiresAt,
      uploadedAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
  }
}
