import { Injectable } from '@nestjs/common';
import { normalizeProfessionalTitle } from '../constants/professional-title.constants';
import {
  PractitionerApplicationStatus,
  PractitionerPayoutMethodType,
} from '@prisma/client';
import {
  PractitionerApplicationCompletionIssue,
  PractitionerApplicationCompletionStep,
  PractitionerApplicationCompletionStepKey,
  PractitionerApplicationCompletionViewModel,
} from '../types/practitioner.types';
import {
  PractitionerRequiredDocumentsService,
  RequiredDocumentRecord,
} from './practitioner-required-documents.service';

type IssueInput = Omit<PractitionerApplicationCompletionIssue, 'stepKey'> & {
  stepKey: PractitionerApplicationCompletionStepKey;
};

type CompletionStepInput = {
  key: PractitionerApplicationCompletionStepKey;
  titleKey: string;
  requiredCount: number;
  completedRequiredCount: number;
  issues: PractitionerApplicationCompletionIssue[];
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildStep(
  input: CompletionStepInput,
): PractitionerApplicationCompletionStep {
  const hasBlockers = input.issues.some(
    (issue) => issue.severity === 'BLOCKER',
  );
  const hasWarnings = input.issues.some(
    (issue) => issue.severity === 'WARNING' || issue.severity === 'INFO',
  );

  return {
    key: input.key,
    titleKey: input.titleKey,
    status: hasBlockers ? 'incomplete' : hasWarnings ? 'warning' : 'complete',
    percent:
      input.requiredCount > 0
        ? clampPercent(
            (input.completedRequiredCount / input.requiredCount) * 100,
          )
        : hasWarnings
          ? 75
          : 100,
    requiredCount: input.requiredCount,
    completedRequiredCount: input.completedRequiredCount,
    issues: input.issues,
  };
}

/**
 * Builds a structured practitioner application completion checklist.
 * The shape is intentionally backend-first and message-key driven so the web/mobile UIs can render their own copy safely.
 */
@Injectable()
export class PractitionerApplicationCompletionService {
  constructor(
    private readonly requiredDocuments: PractitionerRequiredDocumentsService =
      new PractitionerRequiredDocumentsService(),
  ) {}
  private issue(input: IssueInput): PractitionerApplicationCompletionIssue {
    return input;
  }

  build(input: {
    displayName: string | null;
    countryCode: string | null;
    practitionerType: string | null;
    practitionerTypeExplicit?: boolean;
    practitionerGender: string | null;
    professionalTitle: string | null;
    bio: string | null;
    yearsOfExperience: number | null;
    languageCount: number;
    specialtyCount: number;
    primarySpecialtyCategoryId: string | null;
    credentialSummary: {
      totalCredentials: number;
      approvedCount: number;
      pendingCount: number;
      rejectedCount: number;
      expiredCount: number;
    };
    credentialTypes: string[];
    credentialRecords?: RequiredDocumentRecord[];
    payoutDestination: {
      methodType: PractitionerPayoutMethodType | null;
      accountHolderName: string | null;
      bankName: string | null;
      bankAccountNumber: string | null;
      iban: string | null;
      walletProvider: string | null;
      walletIdentifier: string | null;
      otherDetails: string | null;
    } | null;
    isAccountActive: boolean;
    isPractitionerOtpVerified?: boolean | null;
    applicationStatus: PractitionerApplicationStatus | null;
    pricing: {
      session30: { egp: number | null; usd: number | null };
      session60: { egp: number | null; usd: number | null };
    };
  }): PractitionerApplicationCompletionViewModel {
    const applicationLocked =
      input.applicationStatus === PractitionerApplicationStatus.SUBMITTED ||
      input.applicationStatus === PractitionerApplicationStatus.UNDER_REVIEW ||
      input.applicationStatus === PractitionerApplicationStatus.APPROVED ||
      input.applicationStatus === PractitionerApplicationStatus.ARCHIVED;

    const basicProfileIssues: PractitionerApplicationCompletionIssue[] = [];
    if (!input.displayName?.trim()) {
      basicProfileIssues.push(
        this.issue({
          code: 'BASIC_PROFILE_DISPLAY_NAME_MISSING',
          field: 'displayName',
          stepKey: 'basicProfile',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.basicProfile.displayNameRequired',
        }),
      );
    }
    if (!input.countryCode?.trim()) {
      basicProfileIssues.push(
        this.issue({
          code: 'BASIC_PROFILE_COUNTRY_MISSING',
          field: 'countryCode',
          stepKey: 'basicProfile',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.basicProfile.countryRequired',
        }),
      );
    }
    if (!input.practitionerGender?.trim()) {
      basicProfileIssues.push(
        this.issue({
          code: 'BASIC_PROFILE_GENDER_OPTIONAL',
          field: 'practitionerGender',
          stepKey: 'basicProfile',
          severity: 'INFO',
          requirementScope: 'OPTIONAL',
          messageKey:
            'practitioners.application.completion.basicProfile.genderOptional',
        }),
      );
    }

    const professionalDetailsIssues: PractitionerApplicationCompletionIssue[] =
      [];
    if (!normalizeProfessionalTitle(input.professionalTitle)) {
      professionalDetailsIssues.push(
        this.issue({
          code: 'PROFESSIONAL_DETAILS_TITLE_MISSING',
          field: 'professionalTitle',
          stepKey: 'professionalDetails',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.professionalDetails.titleRequired',
        }),
      );
    }
    if (!input.bio?.trim()) {
      professionalDetailsIssues.push(
        this.issue({
          code: 'PROFESSIONAL_DETAILS_BIO_MISSING',
          field: 'bio',
          stepKey: 'professionalDetails',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.professionalDetails.bioRequired',
        }),
      );
    }
    if (
      input.yearsOfExperience === null ||
      input.yearsOfExperience === undefined
    ) {
      professionalDetailsIssues.push(
        this.issue({
          code: 'PROFESSIONAL_DETAILS_YEARS_MISSING',
          field: 'yearsOfExperience',
          stepKey: 'professionalDetails',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.professionalDetails.yearsRequired',
        }),
      );
    } else if (input.yearsOfExperience <= 0) {
      professionalDetailsIssues.push(
        this.issue({
          code: 'PROFESSIONAL_DETAILS_YEARS_NOT_POSITIVE',
          field: 'yearsOfExperience',
          stepKey: 'professionalDetails',
          severity: 'BLOCKER',
          requirementScope: 'APPROVAL',
          messageKey:
            'practitioners.application.completion.professionalDetails.yearsMustBePositive',
          metadata: {
            currentValue: input.yearsOfExperience,
          },
        }),
      );
    }
    if (input.languageCount <= 0) {
      professionalDetailsIssues.push(
        this.issue({
          code: 'PROFESSIONAL_DETAILS_LANGUAGE_MISSING',
          field: 'languageCodes',
          stepKey: 'professionalDetails',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.professionalDetails.languageRequired',
        }),
      );
    }
    if (input.specialtyCount <= 0) {
      professionalDetailsIssues.push(
        this.issue({
          code: 'PROFESSIONAL_DETAILS_SPECIALTY_MISSING',
          field: 'specialtyIds',
          stepKey: 'professionalDetails',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.professionalDetails.specialtyRequired',
        }),
      );
    }
    if (!input.primarySpecialtyCategoryId?.trim()) {
      professionalDetailsIssues.push(
        this.issue({
          code: 'PROFESSIONAL_DETAILS_PRIMARY_CATEGORY_MISSING',
          field: 'primarySpecialtyCategoryId',
          stepKey: 'professionalDetails',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.professionalDetails.primarySpecialtyRequired',
        }),
      );
    }
    if (!input.practitionerType?.trim() || input.practitionerTypeExplicit === false) {
      professionalDetailsIssues.push(
        this.issue({
          code: 'PROFESSIONAL_DETAILS_TYPE_MISSING',
          field: 'practitionerType',
          stepKey: 'professionalDetails',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.professionalDetails.typeRequired',
        }),
      );
    }

    const qualificationIssues: PractitionerApplicationCompletionIssue[] = [];
    const documentGroups = this.requiredDocuments.evaluate(
      input.credentialRecords ??
        input.credentialTypes.map((credentialType) => ({
          credentialType,
          reviewStatus: 'PENDING',
          fileUrl: 'legacy-metadata-present',
        })),
      { countryCode: input.countryCode },
    );
    if (documentGroups.groups.academic.count <= 0) {
      qualificationIssues.push(
        this.issue({
          code: 'QUALIFICATIONS_CREDENTIAL_REQUIRED',
          field: 'credentials',
          stepKey: 'qualifications',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.qualifications.credentialRequired',
        }),
      );
    }
    // Academic certificate (degree) is required for practitioner submission: presence is enough; admin verifies authenticity later.
    if (!documentGroups.groups.academic.complete) {
      qualificationIssues.push(
        this.issue({
          code: 'QUALIFICATIONS_ACADEMIC_CERTIFICATE_REQUIRED',
          field: 'credentials.degree',
          stepKey: 'qualifications',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.qualifications.academicCertificateRequired',
        }),
      );
    }

    const documentIssues: PractitionerApplicationCompletionIssue[] = [];
    if (input.credentialSummary.totalCredentials <= 0) {
      documentIssues.push(
        this.issue({
          code: 'DOCUMENTS_CREDENTIAL_REQUIRED',
          field: 'credentials',
          stepKey: 'documents',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey: 'practitioners.application.completion.documents.credentialRequired',
        }),
      );
    }
    if (!documentGroups.groups.identity.complete) {
      documentIssues.push(
        this.issue({
          code: 'DOCUMENTS_IDENTITY_EVIDENCE_REQUIRED',
          field: 'credentials.identity',
          stepKey: 'documents',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.documents.identityEvidenceRequired',
        }),
      );
      if (documentGroups.groups.identity.missing.includes('NATIONAL_ID_FRONT')) {
          documentIssues.push(
            this.issue({
              code: 'DOCUMENTS_NATIONAL_ID_FRONT_MISSING',
              field: 'credentials.nationalIdFront',
              stepKey: 'documents',
              severity: 'BLOCKER',
              requirementScope: 'SUBMISSION',
              messageKey:
                'practitioners.application.completion.documents.nationalIdFrontRequired',
            }),
          );
        }
        if (documentGroups.groups.identity.missing.includes('NATIONAL_ID_BACK')) {
          documentIssues.push(
            this.issue({
              code: 'DOCUMENTS_NATIONAL_ID_BACK_MISSING',
              field: 'credentials.nationalIdBack',
              stepKey: 'documents',
              severity: 'BLOCKER',
              requirementScope: 'SUBMISSION',
              messageKey:
                'practitioners.application.completion.documents.nationalIdBackRequired',
            }),
          );
        }
      }

    if (!documentGroups.groups.professionalAuthorization.complete) {
      documentIssues.push(
        this.issue({
          code: 'DOCUMENTS_PROFESSIONAL_AUTHORIZATION_REQUIRED',
          field: 'credentials.professionalAuthorization',
          stepKey: 'documents',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.documents.professionalAuthorizationRequired',
        }),
      );
    }

    const payoutIssues: PractitionerApplicationCompletionIssue[] = [];
    if (!input.payoutDestination?.methodType) {
      payoutIssues.push(
        this.issue({
          code: 'PAYOUT_DESTINATION_REQUIRED',
          field: 'payoutDestination.methodType',
          stepKey: 'payoutDetails',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.payout.methodRequired',
        }),
      );
    }
    if (!input.payoutDestination?.accountHolderName?.trim()) {
      payoutIssues.push(
        this.issue({
          code: 'PAYOUT_ACCOUNT_HOLDER_REQUIRED',
          field: 'payoutDestination.accountHolderName',
          stepKey: 'payoutDetails',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.payout.accountHolderRequired',
        }),
      );
    }

    switch (input.payoutDestination?.methodType) {
      case PractitionerPayoutMethodType.BANK_ACCOUNT:
        if (!input.payoutDestination.bankName?.trim()) {
          payoutIssues.push(
            this.issue({
              code: 'PAYOUT_BANK_NAME_REQUIRED',
              field: 'payoutDestination.bankName',
              stepKey: 'payoutDetails',
              severity: 'BLOCKER',
              requirementScope: 'SUBMISSION',
              messageKey:
                'practitioners.application.completion.payout.bankNameRequired',
            }),
          );
        }
        if (!input.payoutDestination.bankAccountNumber?.trim()) {
          payoutIssues.push(
            this.issue({
              code: 'PAYOUT_BANK_ACCOUNT_REQUIRED',
              field: 'payoutDestination.bankAccountNumber',
              stepKey: 'payoutDetails',
              severity: 'BLOCKER',
              requirementScope: 'SUBMISSION',
              messageKey:
                'practitioners.application.completion.payout.bankAccountRequired',
            }),
          );
        }
        break;
      case PractitionerPayoutMethodType.IBAN:
        if (!input.payoutDestination.iban?.trim()) {
          payoutIssues.push(
            this.issue({
              code: 'PAYOUT_IBAN_REQUIRED',
              field: 'payoutDestination.iban',
              stepKey: 'payoutDetails',
              severity: 'BLOCKER',
              requirementScope: 'SUBMISSION',
              messageKey:
                'practitioners.application.completion.payout.ibanRequired',
            }),
          );
        }
        break;
      case PractitionerPayoutMethodType.WALLET:
        if (!input.payoutDestination.walletProvider?.trim()) {
          payoutIssues.push(
            this.issue({
              code: 'PAYOUT_WALLET_PROVIDER_REQUIRED',
              field: 'payoutDestination.walletProvider',
              stepKey: 'payoutDetails',
              severity: 'BLOCKER',
              requirementScope: 'SUBMISSION',
              messageKey:
                'practitioners.application.completion.payout.walletProviderRequired',
            }),
          );
        }
        if (!input.payoutDestination.walletIdentifier?.trim()) {
          payoutIssues.push(
            this.issue({
              code: 'PAYOUT_WALLET_IDENTIFIER_REQUIRED',
              field: 'payoutDestination.walletIdentifier',
              stepKey: 'payoutDetails',
              severity: 'BLOCKER',
              requirementScope: 'SUBMISSION',
              messageKey:
                'practitioners.application.completion.payout.walletIdentifierRequired',
            }),
          );
        }
        break;
      case PractitionerPayoutMethodType.OTHER:
        if (!input.payoutDestination.otherDetails?.trim()) {
          payoutIssues.push(
            this.issue({
              code: 'PAYOUT_OTHER_DETAILS_REQUIRED',
              field: 'payoutDestination.otherDetails',
              stepKey: 'payoutDetails',
              severity: 'BLOCKER',
              requirementScope: 'SUBMISSION',
              messageKey:
                'practitioners.application.completion.payout.otherDetailsRequired',
            }),
          );
        }
        break;
      default:
        break;
    }

    // Payout setup is a post-approval capability. It must be visible to the
    // applicant, but it cannot block initial submission or approval.
    for (const issue of payoutIssues) {
      issue.severity = 'WARNING';
      issue.requirementScope = 'OPTIONAL';
    }

    const reviewSubmitIssues: PractitionerApplicationCompletionIssue[] = [];
    if (!input.isAccountActive) {
      reviewSubmitIssues.push(
        this.issue({
          code: 'ACCOUNT_INACTIVE',
          field: 'accountStatus',
          stepKey: 'reviewSubmit',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.reviewSubmit.accountInactive',
        }),
      );
    }
    if (input.isPractitionerOtpVerified === false) {
      reviewSubmitIssues.push(
        this.issue({
          code: 'PRACTITIONER_OTP_NOT_VERIFIED',
          field: 'otpVerification',
          stepKey: 'reviewSubmit',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.reviewSubmit.otpNotVerified',
        }),
      );
    }
    if (applicationLocked) {
      reviewSubmitIssues.push(
        this.issue({
          code: `APPLICATION_${String(input.applicationStatus ?? 'UNKNOWN')}`,
          field: 'applicationStatus',
          stepKey: 'reviewSubmit',
          severity: 'BLOCKER',
          requirementScope: 'SUBMISSION',
          messageKey:
            'practitioners.application.completion.reviewSubmit.applicationLocked',
          metadata: {
            status: input.applicationStatus,
          },
        }),
      );
    }

    const basicProfileStep = buildStep({
      key: 'basicProfile',
      titleKey: 'practitionerApplication.steps.basicProfile',
      requiredCount: 2,
      completedRequiredCount: [
        input.displayName?.trim() ? 1 : 0,
        input.countryCode?.trim() ? 1 : 0,
      ].reduce((sum, value) => sum + value, 0),
      issues: basicProfileIssues,
    });

    const professionalDetailsStep = buildStep({
      key: 'professionalDetails',
      titleKey: 'practitionerApplication.steps.professionalDetails',
      requiredCount: 6,
      completedRequiredCount: [
        input.professionalTitle?.trim() ? 1 : 0,
        input.bio?.trim() ? 1 : 0,
        input.yearsOfExperience !== null &&
        input.yearsOfExperience !== undefined
          ? 1
          : 0,
        input.languageCount > 0 ? 1 : 0,
        input.specialtyCount > 0 ? 1 : 0,
        input.primarySpecialtyCategoryId?.trim() ? 1 : 0,
      ].reduce((sum, value) => sum + value, 0),
      issues: professionalDetailsIssues,
    });

    const qualificationsStep = buildStep({
      key: 'qualifications',
      titleKey: 'practitionerApplication.steps.qualifications',
      requiredCount: 1,
      completedRequiredCount:
        input.credentialSummary.totalCredentials > 0 ? 1 : 0,
      issues: qualificationIssues,
    });

    const documentsStep = buildStep({
      key: 'documents',
      titleKey: 'practitionerApplication.steps.documents',
      requiredCount:
        input.credentialSummary.totalCredentials > 0
          ? input.credentialSummary.totalCredentials
          : 1,
      completedRequiredCount: input.credentialSummary.approvedCount,
      issues: documentIssues,
    });

    const payoutDetailsStep = buildStep({
      key: 'payoutDetails',
      titleKey: 'practitionerApplication.steps.payoutDetails',
      requiredCount: 2,
      completedRequiredCount: [
        input.payoutDestination?.methodType ? 1 : 0,
        input.payoutDestination?.accountHolderName?.trim() ? 1 : 0,
      ].reduce((sum, value) => sum + value, 0),
      issues: payoutIssues,
    });

    const reviewSubmitStep = buildStep({
      key: 'reviewSubmit',
      titleKey: 'practitionerApplication.steps.reviewSubmit',
      requiredCount: 3,
      completedRequiredCount: [
        input.isAccountActive ? 1 : 0,
        input.isPractitionerOtpVerified === false ? 0 : 1,
        applicationLocked ? 0 : 1,
      ].reduce((sum, value) => sum + value, 0),
      issues: reviewSubmitIssues,
    });

    const steps = [
      basicProfileStep,
      professionalDetailsStep,
      qualificationsStep,
      documentsStep,
      payoutDetailsStep,
      reviewSubmitStep,
    ];

    const allIssues = [
      ...basicProfileIssues,
      ...professionalDetailsIssues,
      ...qualificationIssues,
      ...documentIssues,
      ...payoutIssues,
      ...reviewSubmitIssues,
    ];

    const blockers = allIssues.filter((issue) => issue.severity === 'BLOCKER');
    const warnings = allIssues.filter(
      (issue) => issue.severity === 'WARNING' || issue.severity === 'INFO',
    );

    const totalRequiredCount = steps.reduce(
      (sum, step) => sum + step.requiredCount,
      0,
    );
    const totalCompletedRequiredCount = steps.reduce(
      (sum, step) => sum + step.completedRequiredCount,
      0,
    );

    return {
      overallPercent:
        totalRequiredCount > 0
          ? clampPercent(
              (totalCompletedRequiredCount / totalRequiredCount) * 100,
            )
          : 100,
      canSubmit: blockers.every(
        (issue) => issue.requirementScope !== 'SUBMISSION',
      ),
      blockers,
      warnings,
      steps,
      documentGroups,
    };
  }
}
