import {
  PractitionerApplicationStatus,
  PractitionerPayoutMethodType,
} from '@prisma/client';
import { PractitionerApplicationCompletionService } from './practitioner-application-completion.service';

describe('PractitionerApplicationCompletionService', () => {
  const service = new PractitionerApplicationCompletionService();

  it('returns blockers and step statuses for an empty draft', () => {
    const result = service.build({
      displayName: null,
      countryCode: null,
      practitionerType: null,
      practitionerGender: null,
      professionalTitle: null,
      bio: null,
      yearsOfExperience: null,
      languageCount: 0,
      specialtyCount: 0,
      primarySpecialtyCategoryId: null,
      credentialSummary: {
        totalCredentials: 0,
        approvedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
        expiredCount: 0,
      },
      credentialTypes: [],
      payoutDestination: null,
      isAccountActive: false,
      isPractitionerOtpVerified: false,
      applicationStatus: PractitionerApplicationStatus.DRAFT,
      pricing: {
        session30: { egp: null, usd: null },
        session60: { egp: null, usd: null },
      },
    });

    expect(result.canSubmit).toBe(false);
    expect(result.blockers.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'BASIC_PROFILE_DISPLAY_NAME_MISSING',
        'BASIC_PROFILE_COUNTRY_MISSING',
        'PROFESSIONAL_DETAILS_TITLE_MISSING',
        'PROFESSIONAL_DETAILS_BIO_MISSING',
        'PROFESSIONAL_DETAILS_YEARS_MISSING',
        'PROFESSIONAL_DETAILS_LANGUAGE_MISSING',
        'PROFESSIONAL_DETAILS_SPECIALTY_MISSING',
        'PROFESSIONAL_DETAILS_PRIMARY_CATEGORY_MISSING',
        'QUALIFICATIONS_CREDENTIAL_REQUIRED',
        'QUALIFICATIONS_ACADEMIC_CERTIFICATE_REQUIRED',
        'DOCUMENTS_CREDENTIAL_REQUIRED',
        'PAYOUT_DESTINATION_REQUIRED',
        'PAYOUT_ACCOUNT_HOLDER_REQUIRED',
        'ACCOUNT_INACTIVE',
        'PRACTITIONER_OTP_NOT_VERIFIED',
      ]),
    );
    expect(
      result.steps.find((step) => step.key === 'basicProfile')?.status,
    ).toBe('incomplete');
    expect(
      result.steps.find((step) => step.key === 'reviewSubmit')?.status,
    ).toBe('incomplete');
  });

  it('returns canSubmit when the application is ready', () => {
    const result = service.build({
      displayName: 'Dr. Nour',
      countryCode: 'EG',
      practitionerType: 'THERAPIST',
      practitionerGender: 'FEMALE',
      professionalTitle: 'Psychologist',
      bio: 'Short bio',
      yearsOfExperience: 5,
      languageCount: 2,
      specialtyCount: 1,
      primarySpecialtyCategoryId: '11111111-1111-4111-8111-111111111111',
      credentialSummary: {
        totalCredentials: 2,
        approvedCount: 2,
        pendingCount: 0,
        rejectedCount: 0,
        expiredCount: 0,
      },
      credentialTypes: ['PASSPORT' as const, 'DEGREE' as const],
      payoutDestination: {
        methodType: PractitionerPayoutMethodType.BANK_ACCOUNT,
        accountHolderName: 'Dr. Nour',
        bankName: 'Bank',
        bankAccountNumber: '123456789',
        iban: null,
        walletProvider: null,
        walletIdentifier: null,
        otherDetails: null,
      },
      isAccountActive: true,
      isPractitionerOtpVerified: true,
      applicationStatus: PractitionerApplicationStatus.DRAFT,
      pricing: {
        session30: { egp: 250, usd: 8 },
        session60: { egp: 450, usd: 15 },
      },
    });

    expect(result.canSubmit).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.overallPercent).toBe(100);
    expect(result.steps.every((step) => step.status === 'complete')).toBe(true);
  });

  it('adds conditional payout blockers for wallet payouts missing required fields', () => {
    const result = service.build({
      displayName: 'Dr. Nour',
      countryCode: 'EG',
      practitionerType: 'THERAPIST',
      practitionerGender: null,
      professionalTitle: 'Psychologist',
      bio: 'Short bio',
      yearsOfExperience: 5,
      languageCount: 1,
      specialtyCount: 1,
      primarySpecialtyCategoryId: '11111111-1111-4111-8111-111111111111',
      credentialSummary: {
        totalCredentials: 1,
        approvedCount: 1,
        pendingCount: 0,
        rejectedCount: 0,
        expiredCount: 0,
      },
      credentialTypes: ['PASSPORT' as const],
      payoutDestination: {
        methodType: PractitionerPayoutMethodType.WALLET,
        accountHolderName: 'Dr. Nour',
        bankName: null,
        bankAccountNumber: null,
        iban: null,
        walletProvider: null,
        walletIdentifier: null,
        otherDetails: null,
      },
      isAccountActive: true,
      isPractitionerOtpVerified: true,
      applicationStatus: PractitionerApplicationStatus.DRAFT,
      pricing: {
        session30: { egp: 250, usd: 8 },
        session60: { egp: 450, usd: 15 },
      },
    });

    expect(result.blockers.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'PAYOUT_WALLET_PROVIDER_REQUIRED',
        'PAYOUT_WALLET_IDENTIFIER_REQUIRED',
      ]),
    );
    expect(
      result.steps.find((step) => step.key === 'payoutDetails')?.status,
    ).toBe('incomplete');
  });

  it('blocks submission when only one side of national id is uploaded', () => {
    const result = service.build({
      displayName: 'Dr. Nour',
      countryCode: 'EG',
      practitionerType: 'THERAPIST',
      practitionerGender: null,
      professionalTitle: 'Psychologist',
      bio: 'Short bio',
      yearsOfExperience: 5,
      languageCount: 1,
      specialtyCount: 1,
      primarySpecialtyCategoryId: '11111111-1111-4111-8111-111111111111',
      credentialSummary: {
        totalCredentials: 1,
        approvedCount: 1,
        pendingCount: 0,
        rejectedCount: 0,
        expiredCount: 0,
      },
      credentialTypes: ['NATIONAL_ID_FRONT' as const],
      payoutDestination: {
        methodType: PractitionerPayoutMethodType.BANK_ACCOUNT,
        accountHolderName: 'Dr. Nour',
        bankName: 'Bank',
        bankAccountNumber: '123456789',
        iban: null,
        walletProvider: null,
        walletIdentifier: null,
        otherDetails: null,
      },
      isAccountActive: true,
      isPractitionerOtpVerified: true,
      applicationStatus: PractitionerApplicationStatus.DRAFT,
      pricing: {
        session30: { egp: 250, usd: 8 },
        session60: { egp: 450, usd: 15 },
      },
    });

    expect(result.canSubmit).toBe(false);
    expect(result.blockers.map((item) => item.code)).toEqual(
      expect.arrayContaining(['DOCUMENTS_IDENTITY_EVIDENCE_REQUIRED']),
    );
  });

  it('passes identity requirement with national id front and back', () => {
    const result = service.build({
      displayName: 'Dr. Nour',
      countryCode: 'EG',
      practitionerType: 'THERAPIST',
      practitionerGender: null,
      professionalTitle: 'Psychologist',
      bio: 'Short bio',
      yearsOfExperience: 5,
      languageCount: 1,
      specialtyCount: 1,
      primarySpecialtyCategoryId: '11111111-1111-4111-8111-111111111111',
      credentialSummary: {
        totalCredentials: 2,
        approvedCount: 2,
        pendingCount: 0,
        rejectedCount: 0,
        expiredCount: 0,
      },
      credentialTypes: [
        'NATIONAL_ID_FRONT' as const,
        'NATIONAL_ID_BACK' as const,
      ],
      payoutDestination: {
        methodType: PractitionerPayoutMethodType.BANK_ACCOUNT,
        accountHolderName: 'Dr. Nour',
        bankName: 'Bank',
        bankAccountNumber: '123456789',
        iban: null,
        walletProvider: null,
        walletIdentifier: null,
        otherDetails: null,
      },
      isAccountActive: true,
      isPractitionerOtpVerified: true,
      applicationStatus: PractitionerApplicationStatus.DRAFT,
      pricing: {
        session30: { egp: 250, usd: 8 },
        session60: { egp: 450, usd: 15 },
      },
    });

    expect(
      result.blockers.some(
        (item) => item.code === 'DOCUMENTS_IDENTITY_EVIDENCE_REQUIRED',
      ),
    ).toBe(false);
  });
});
