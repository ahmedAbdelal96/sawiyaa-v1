export type PractitionerApplicationIssueCopy = {
  titleKey: string;
  descriptionKey: string;
  whyItMattersKey: string;
  recommendedActionKey: string;
};

const FALLBACK_COPY: PractitionerApplicationIssueCopy = {
  titleKey: "application.completionIssues.generic.title",
  descriptionKey: "application.completionIssues.generic.description",
  whyItMattersKey: "application.completionIssues.generic.whyItMatters",
  recommendedActionKey: "application.completionIssues.generic.recommendedAction",
};

const ISSUE_COPY: Record<string, PractitionerApplicationIssueCopy> = {
  BASIC_PROFILE_DISPLAY_NAME_MISSING: {
    titleKey: "application.completionIssues.codes.BASIC_PROFILE_DISPLAY_NAME_MISSING.title",
    descriptionKey: "application.completionIssues.codes.BASIC_PROFILE_DISPLAY_NAME_MISSING.description",
    whyItMattersKey: "application.completionIssues.codes.BASIC_PROFILE_DISPLAY_NAME_MISSING.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.BASIC_PROFILE_DISPLAY_NAME_MISSING.recommendedAction",
  },
  BASIC_PROFILE_COUNTRY_MISSING: {
    titleKey: "application.completionIssues.codes.BASIC_PROFILE_COUNTRY_MISSING.title",
    descriptionKey: "application.completionIssues.codes.BASIC_PROFILE_COUNTRY_MISSING.description",
    whyItMattersKey: "application.completionIssues.codes.BASIC_PROFILE_COUNTRY_MISSING.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.BASIC_PROFILE_COUNTRY_MISSING.recommendedAction",
  },
  PROFESSIONAL_DETAILS_TITLE_MISSING: {
    titleKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_TITLE_MISSING.title",
    descriptionKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_TITLE_MISSING.description",
    whyItMattersKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_TITLE_MISSING.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_TITLE_MISSING.recommendedAction",
  },
  PROFESSIONAL_DETAILS_BIO_MISSING: {
    titleKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_BIO_MISSING.title",
    descriptionKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_BIO_MISSING.description",
    whyItMattersKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_BIO_MISSING.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_BIO_MISSING.recommendedAction",
  },
  PROFESSIONAL_DETAILS_YEARS_MISSING: {
    titleKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_YEARS_MISSING.title",
    descriptionKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_YEARS_MISSING.description",
    whyItMattersKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_YEARS_MISSING.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_YEARS_MISSING.recommendedAction",
  },
  PROFESSIONAL_DETAILS_LANGUAGE_MISSING: {
    titleKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_LANGUAGE_MISSING.title",
    descriptionKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_LANGUAGE_MISSING.description",
    whyItMattersKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_LANGUAGE_MISSING.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_LANGUAGE_MISSING.recommendedAction",
  },
  PROFESSIONAL_DETAILS_SPECIALTY_MISSING: {
    titleKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_SPECIALTY_MISSING.title",
    descriptionKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_SPECIALTY_MISSING.description",
    whyItMattersKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_SPECIALTY_MISSING.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_SPECIALTY_MISSING.recommendedAction",
  },
  PROFESSIONAL_DETAILS_PRIMARY_CATEGORY_MISSING: {
    titleKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_PRIMARY_CATEGORY_MISSING.title",
    descriptionKey: "application.completionIssues.codes.PROFESSIONAL_DETAILS_PRIMARY_CATEGORY_MISSING.description",
    whyItMattersKey:
      "application.completionIssues.codes.PROFESSIONAL_DETAILS_PRIMARY_CATEGORY_MISSING.whyItMatters",
    recommendedActionKey:
      "application.completionIssues.codes.PROFESSIONAL_DETAILS_PRIMARY_CATEGORY_MISSING.recommendedAction",
  },
  QUALIFICATIONS_CREDENTIAL_REQUIRED: {
    titleKey: "application.completionIssues.codes.QUALIFICATIONS_CREDENTIAL_REQUIRED.title",
    descriptionKey: "application.completionIssues.codes.QUALIFICATIONS_CREDENTIAL_REQUIRED.description",
    whyItMattersKey: "application.completionIssues.codes.QUALIFICATIONS_CREDENTIAL_REQUIRED.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.QUALIFICATIONS_CREDENTIAL_REQUIRED.recommendedAction",
  },
  QUALIFICATIONS_ACADEMIC_CERTIFICATE_REQUIRED: {
    titleKey: "application.completionIssues.codes.QUALIFICATIONS_ACADEMIC_CERTIFICATE_REQUIRED.title",
    descriptionKey: "application.completionIssues.codes.QUALIFICATIONS_ACADEMIC_CERTIFICATE_REQUIRED.description",
    whyItMattersKey: "application.completionIssues.codes.QUALIFICATIONS_ACADEMIC_CERTIFICATE_REQUIRED.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.QUALIFICATIONS_ACADEMIC_CERTIFICATE_REQUIRED.recommendedAction",
  },
  DOCUMENTS_CREDENTIAL_REQUIRED: {
    titleKey: "application.completionIssues.codes.DOCUMENTS_CREDENTIAL_REQUIRED.title",
    descriptionKey: "application.completionIssues.codes.DOCUMENTS_CREDENTIAL_REQUIRED.description",
    whyItMattersKey: "application.completionIssues.codes.DOCUMENTS_CREDENTIAL_REQUIRED.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.DOCUMENTS_CREDENTIAL_REQUIRED.recommendedAction",
  },
  DOCUMENTS_CREDENTIAL_NOT_APPROVED: {
    titleKey: "application.completionIssues.codes.DOCUMENTS_CREDENTIAL_NOT_APPROVED.title",
    descriptionKey: "application.completionIssues.codes.DOCUMENTS_CREDENTIAL_NOT_APPROVED.description",
    whyItMattersKey: "application.completionIssues.codes.DOCUMENTS_CREDENTIAL_NOT_APPROVED.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.DOCUMENTS_CREDENTIAL_NOT_APPROVED.recommendedAction",
  },
  DOCUMENTS_IDENTITY_EVIDENCE_REQUIRED: {
    titleKey: "application.completionIssues.codes.DOCUMENTS_IDENTITY_EVIDENCE_REQUIRED.title",
    descriptionKey: "application.completionIssues.codes.DOCUMENTS_IDENTITY_EVIDENCE_REQUIRED.description",
    whyItMattersKey: "application.completionIssues.codes.DOCUMENTS_IDENTITY_EVIDENCE_REQUIRED.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.DOCUMENTS_IDENTITY_EVIDENCE_REQUIRED.recommendedAction",
  },
  DOCUMENTS_NATIONAL_ID_FRONT_MISSING: {
    titleKey: "application.completionIssues.codes.DOCUMENTS_NATIONAL_ID_FRONT_MISSING.title",
    descriptionKey: "application.completionIssues.codes.DOCUMENTS_NATIONAL_ID_FRONT_MISSING.description",
    whyItMattersKey: "application.completionIssues.codes.DOCUMENTS_NATIONAL_ID_FRONT_MISSING.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.DOCUMENTS_NATIONAL_ID_FRONT_MISSING.recommendedAction",
  },
  DOCUMENTS_NATIONAL_ID_BACK_MISSING: {
    titleKey: "application.completionIssues.codes.DOCUMENTS_NATIONAL_ID_BACK_MISSING.title",
    descriptionKey: "application.completionIssues.codes.DOCUMENTS_NATIONAL_ID_BACK_MISSING.description",
    whyItMattersKey: "application.completionIssues.codes.DOCUMENTS_NATIONAL_ID_BACK_MISSING.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.DOCUMENTS_NATIONAL_ID_BACK_MISSING.recommendedAction",
  },
  PAYOUT_DESTINATION_REQUIRED: {
    titleKey: "application.completionIssues.codes.PAYOUT_DESTINATION_REQUIRED.title",
    descriptionKey: "application.completionIssues.codes.PAYOUT_DESTINATION_REQUIRED.description",
    whyItMattersKey: "application.completionIssues.codes.PAYOUT_DESTINATION_REQUIRED.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.PAYOUT_DESTINATION_REQUIRED.recommendedAction",
  },
  PAYOUT_ACCOUNT_HOLDER_REQUIRED: {
    titleKey: "application.completionIssues.codes.PAYOUT_ACCOUNT_HOLDER_REQUIRED.title",
    descriptionKey: "application.completionIssues.codes.PAYOUT_ACCOUNT_HOLDER_REQUIRED.description",
    whyItMattersKey: "application.completionIssues.codes.PAYOUT_ACCOUNT_HOLDER_REQUIRED.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.PAYOUT_ACCOUNT_HOLDER_REQUIRED.recommendedAction",
  },
  PAYOUT_BANK_NAME_REQUIRED: {
    titleKey: "application.completionIssues.codes.PAYOUT_BANK_NAME_REQUIRED.title",
    descriptionKey: "application.completionIssues.codes.PAYOUT_BANK_NAME_REQUIRED.description",
    whyItMattersKey: "application.completionIssues.codes.PAYOUT_BANK_NAME_REQUIRED.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.PAYOUT_BANK_NAME_REQUIRED.recommendedAction",
  },
  PAYOUT_BANK_ACCOUNT_REQUIRED: {
    titleKey: "application.completionIssues.codes.PAYOUT_BANK_ACCOUNT_REQUIRED.title",
    descriptionKey: "application.completionIssues.codes.PAYOUT_BANK_ACCOUNT_REQUIRED.description",
    whyItMattersKey: "application.completionIssues.codes.PAYOUT_BANK_ACCOUNT_REQUIRED.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.PAYOUT_BANK_ACCOUNT_REQUIRED.recommendedAction",
  },
  PAYOUT_IBAN_REQUIRED: {
    titleKey: "application.completionIssues.codes.PAYOUT_IBAN_REQUIRED.title",
    descriptionKey: "application.completionIssues.codes.PAYOUT_IBAN_REQUIRED.description",
    whyItMattersKey: "application.completionIssues.codes.PAYOUT_IBAN_REQUIRED.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.PAYOUT_IBAN_REQUIRED.recommendedAction",
  },
  PAYOUT_WALLET_PROVIDER_REQUIRED: {
    titleKey: "application.completionIssues.codes.PAYOUT_WALLET_PROVIDER_REQUIRED.title",
    descriptionKey: "application.completionIssues.codes.PAYOUT_WALLET_PROVIDER_REQUIRED.description",
    whyItMattersKey: "application.completionIssues.codes.PAYOUT_WALLET_PROVIDER_REQUIRED.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.PAYOUT_WALLET_PROVIDER_REQUIRED.recommendedAction",
  },
  PAYOUT_WALLET_IDENTIFIER_REQUIRED: {
    titleKey: "application.completionIssues.codes.PAYOUT_WALLET_IDENTIFIER_REQUIRED.title",
    descriptionKey: "application.completionIssues.codes.PAYOUT_WALLET_IDENTIFIER_REQUIRED.description",
    whyItMattersKey: "application.completionIssues.codes.PAYOUT_WALLET_IDENTIFIER_REQUIRED.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.PAYOUT_WALLET_IDENTIFIER_REQUIRED.recommendedAction",
  },
  PAYOUT_OTHER_DETAILS_REQUIRED: {
    titleKey: "application.completionIssues.codes.PAYOUT_OTHER_DETAILS_REQUIRED.title",
    descriptionKey: "application.completionIssues.codes.PAYOUT_OTHER_DETAILS_REQUIRED.description",
    whyItMattersKey: "application.completionIssues.codes.PAYOUT_OTHER_DETAILS_REQUIRED.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.PAYOUT_OTHER_DETAILS_REQUIRED.recommendedAction",
  },
  ACCOUNT_INACTIVE: {
    titleKey: "application.completionIssues.codes.ACCOUNT_INACTIVE.title",
    descriptionKey: "application.completionIssues.codes.ACCOUNT_INACTIVE.description",
    whyItMattersKey: "application.completionIssues.codes.ACCOUNT_INACTIVE.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.ACCOUNT_INACTIVE.recommendedAction",
  },
  PRACTITIONER_OTP_NOT_VERIFIED: {
    titleKey: "application.completionIssues.codes.PRACTITIONER_OTP_NOT_VERIFIED.title",
    descriptionKey: "application.completionIssues.codes.PRACTITIONER_OTP_NOT_VERIFIED.description",
    whyItMattersKey: "application.completionIssues.codes.PRACTITIONER_OTP_NOT_VERIFIED.whyItMatters",
    recommendedActionKey: "application.completionIssues.codes.PRACTITIONER_OTP_NOT_VERIFIED.recommendedAction",
  },
};

export function getPractitionerApplicationIssueCopy(code: string): PractitionerApplicationIssueCopy {
  return ISSUE_COPY[code] ?? FALLBACK_COPY;
}
