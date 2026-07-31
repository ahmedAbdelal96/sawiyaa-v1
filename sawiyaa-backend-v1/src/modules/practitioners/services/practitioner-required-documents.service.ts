import { Injectable } from '@nestjs/common';

export type RequiredDocumentRecord = {
  credentialType: string;
  reviewStatus?: string | null;
  expiresAt?: Date | null;
  fileUrl?: string | null;
};

export type RequiredDocumentGroups = {
  complete: boolean;
  groups: {
    identity: {
      complete: boolean;
      satisfiedBy: 'PASSPORT_IDENTITY_PAGE' | 'NATIONAL_ID' | null;
      missing: string[];
    };
    academic: { complete: boolean; count: number };
    professionalAuthorization: {
      complete: boolean;
      satisfiedBy: 'SYNDICATE_CARD' | 'PRACTICE_LICENSE' | null;
      missing: string[];
    };
  };
  missingRequirements: string[];
  missingDocumentTypes: string[];
};

/** Single authoritative interpretation of the mandatory practitioner documents. */
@Injectable()
export class PractitionerRequiredDocumentsService {
  evaluate(records: RequiredDocumentRecord[]): RequiredDocumentGroups {
    const valid = records.filter((record) => {
      if (!record.fileUrl?.trim()) return false;
      if (record.reviewStatus && !['PENDING', 'APPROVED'].includes(record.reviewStatus)) return false;
      if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) return false;
      return true;
    });
    const types = new Set(valid.map((record) => record.credentialType));
    const hasPassport = types.has('PASSPORT');
    const hasFront = types.has('NATIONAL_ID_FRONT');
    const hasBack = types.has('NATIONAL_ID_BACK');
    const hasAcademic = valid.filter((record) => record.credentialType === 'DEGREE').length;
    const hasSyndicate = types.has('MEMBERSHIP');
    const hasLicense = types.has('LICENSE');
    const identityComplete = hasPassport || (hasFront && hasBack);
    const professionalComplete = hasSyndicate || hasLicense;
    const identityMissing = identityComplete
      ? []
      : hasFront
        ? ['NATIONAL_ID_BACK']
        : hasBack
          ? ['NATIONAL_ID_FRONT']
          : ['PASSPORT_IDENTITY_PAGE', 'NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK'];
    const missingRequirements: string[] = [];
    const missingDocumentTypes: string[] = [];
    if (!identityComplete) {
      missingRequirements.push('IDENTITY_PROOF');
      missingDocumentTypes.push(...identityMissing);
    }
    if (hasAcademic === 0) {
      missingRequirements.push('ACADEMIC_CERTIFICATE');
      missingDocumentTypes.push('ACADEMIC_CERTIFICATE');
    }
    if (!professionalComplete) {
      missingRequirements.push('PROFESSIONAL_AUTHORIZATION');
      missingDocumentTypes.push('SYNDICATE_CARD', 'PRACTICE_LICENSE');
    }
    return {
      complete: missingRequirements.length === 0,
      groups: {
        identity: {
          complete: identityComplete,
          satisfiedBy: hasPassport ? 'PASSPORT_IDENTITY_PAGE' : identityComplete ? 'NATIONAL_ID' : null,
          missing: identityMissing,
        },
        academic: { complete: hasAcademic > 0, count: hasAcademic },
        professionalAuthorization: {
          complete: professionalComplete,
          satisfiedBy: hasSyndicate ? 'SYNDICATE_CARD' : hasLicense ? 'PRACTICE_LICENSE' : null,
          missing: professionalComplete ? [] : ['SYNDICATE_CARD', 'PRACTICE_LICENSE'],
        },
      },
      missingRequirements,
      missingDocumentTypes,
    };
  }
}
