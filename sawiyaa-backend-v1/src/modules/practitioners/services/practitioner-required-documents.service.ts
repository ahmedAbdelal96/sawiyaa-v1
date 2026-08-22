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
      satisfiedBy: 'NATIONAL_ID' | null;
      policy: PractitionerIdentityRequirement;
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

export type PractitionerIdentityRequirement = {
  countryCode: string | null;
  acceptedCredentialTypes: Array<'NATIONAL_ID' | 'NATIONAL_ID_FRONT' | 'NATIONAL_ID_BACK'>;
  requiredCredentialSets: Array<Array<'NATIONAL_ID' | 'NATIONAL_ID_FRONT' | 'NATIONAL_ID_BACK'>>;
  requireBackImage: boolean;
};

/**
 * Country-aware identity configuration. Egypt is the launch configuration;
 * unknown countries use the existing single-document NATIONAL_ID semantic so
 * the domain does not globally require a front/back pair.
 */
export function resolvePractitionerIdentityRequirement(
  countryCode?: string | null,
): PractitionerIdentityRequirement {
  const normalizedCountryCode = countryCode?.trim().toUpperCase() || null;
  if (normalizedCountryCode === 'EG' || normalizedCountryCode === null) {
    return {
      countryCode: normalizedCountryCode,
      acceptedCredentialTypes: ['NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK'],
      requiredCredentialSets: [['NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK']],
      requireBackImage: true,
    };
  }

  return {
    countryCode: normalizedCountryCode,
    acceptedCredentialTypes: ['NATIONAL_ID'],
    requiredCredentialSets: [['NATIONAL_ID']],
    requireBackImage: false,
  };
}

/** Single authoritative interpretation of the mandatory practitioner documents. */
@Injectable()
export class PractitionerRequiredDocumentsService {
  evaluate(
    records: RequiredDocumentRecord[],
    input: { countryCode?: string | null } = {},
  ): RequiredDocumentGroups {
    const valid = records.filter((record) => {
      if (!record.fileUrl?.trim()) return false;
      if (record.reviewStatus && !['PENDING', 'APPROVED'].includes(record.reviewStatus)) return false;
      if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) return false;
      return true;
    });
    const types = new Set(valid.map((record) => record.credentialType));
    const identityPolicy = resolvePractitionerIdentityRequirement(input.countryCode);
    const hasFront = types.has('NATIONAL_ID_FRONT');
    const hasBack = types.has('NATIONAL_ID_BACK');
    const hasAcademic = valid.filter((record) => record.credentialType === 'DEGREE').length;
    const hasSyndicate = types.has('MEMBERSHIP');
    const hasLicense = types.has('LICENSE');
    // Passport is intentionally excluded from every country policy.
    const identityComplete = identityPolicy.requiredCredentialSets.some((set) =>
      set.every((credentialType) => types.has(credentialType)),
    );
    const professionalComplete = hasSyndicate || hasLicense;
    const identityMissing = identityComplete
      ? []
      : identityPolicy.requiredCredentialSets[0].filter(
          (credentialType) => !types.has(credentialType),
        );
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
          satisfiedBy: identityComplete ? 'NATIONAL_ID' : null,
          policy: identityPolicy,
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
