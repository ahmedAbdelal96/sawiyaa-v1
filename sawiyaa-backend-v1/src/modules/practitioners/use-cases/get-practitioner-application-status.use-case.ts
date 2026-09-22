import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerApplicationMapper } from '../mappers/practitioner-application.mapper';
import { PractitionerApplicationEligibilityPolicy } from '../policies/practitioner-application-eligibility.policy';
import { PractitionerApplicationRepository } from '../repositories/practitioner-application.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { GetPractitionerProfileReadinessUseCase } from './get-practitioner-profile-readiness.use-case';
import { PractitionerReviewCaseService } from '../services/practitioner-review-case.service';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';
import { PractitionerUserRepository } from '../repositories/practitioner-user.repository';
import { PractitionerRequiredDocumentsService } from '../services/practitioner-required-documents.service';

/**
 * Returns current practitioner's latest application status summary with readiness/eligibility context.
 * This keeps frontend state-management deterministic without exposing admin workflow internals.
 */
@Injectable()
export class GetPractitionerApplicationStatusUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly practitionerProfileRepository: PractitionerProfileRepository,
    private readonly practitionerApplicationRepository: PractitionerApplicationRepository,
    private readonly practitionerApplicationMapper: PractitionerApplicationMapper,
    private readonly practitionerApplicationEligibilityPolicy: PractitionerApplicationEligibilityPolicy,
    private readonly getPractitionerProfileReadinessUseCase: GetPractitionerProfileReadinessUseCase,
    private readonly practitionerReviewCaseService: PractitionerReviewCaseService,
    private readonly practitionerCredentialRepository: PractitionerCredentialRepository,
    private readonly practitionerUserRepository: PractitionerUserRepository,
    private readonly practitionerRequiredDocumentsService: PractitionerRequiredDocumentsService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    currentUser: AuthenticatedUser;
  }) {
    const profile = await this.practitionerProfileRepository.findByUserId(
      input.userId,
    );

    if (!profile) {
      const [latestApplication, user] = await Promise.all([
        this.practitionerApplicationRepository.findLatestByUserId(input.userId),
        this.practitionerUserRepository.findProfileSeed(input.userId),
      ]);
      if (!latestApplication || !user) {
        throw new NotFoundException({ error: 'PRACTITIONER_APPLICATION_NOT_FOUND' });
      }
      const snapshot = (latestApplication.submissionSnapshot ?? {}) as Record<string, any>;
      const profileSnapshot = (snapshot.profile ?? {}) as Record<string, any>;
      const credentials = await this.practitionerCredentialRepository.listByApplicationId(latestApplication.id);
      const docs = this.practitionerRequiredDocumentsService.evaluate(credentials.map((credential) => ({ credentialType: credential.credentialType, reviewStatus: credential.reviewStatus, expiresAt: credential.expiresAt, fileUrl: credential.fileUrl })), { countryCode: profileSnapshot.countryCode });
      const missing = [
        ...(user.displayName?.trim() ? [] : ['displayName']),
        ...(profileSnapshot.countryCode ? [] : ['countryCode']),
        ...(profileSnapshot.professionalTitle?.trim() ? [] : ['professionalTitle']),
        ...(profileSnapshot.bio?.trim() ? [] : ['bio']),
        ...(profileSnapshot.yearsOfExperience === null || profileSnapshot.yearsOfExperience === undefined ? ['yearsOfExperience'] : []),
        ...(Array.isArray(snapshot.languageCodes) && snapshot.languageCodes.length ? [] : ['languages']),
        ...(profileSnapshot.primarySpecialtyCategoryId || snapshot.specialtySelection?.primarySpecialtyCategoryId ? [] : ['primarySpecialtyCategoryId']),
        ...(Array.isArray(snapshot.specialtySelection?.specialties) && snapshot.specialtySelection.specialties.length ? [] : ['specialties']),
        ...(docs.complete ? [] : docs.missingRequirements),
      ];
      const reviewCase = await this.practitionerReviewCaseService.findActiveApplicationCase(latestApplication.id);
      const completion = {
        overallPercent: missing.length ? 0 : 100,
        canSubmit: missing.length === 0 && input.currentUser.isActive === true && input.currentUser.isPractitionerOtpVerified !== false,
        blockers: missing.map((field) => ({ code: `APPLICATION_${String(field).toUpperCase()}_REQUIRED`, field, stepKey: 'reviewSubmit', severity: 'BLOCKER', requirementScope: 'SUBMISSION', messageKey: 'practitioners.application.completion.required' })),
        warnings: [],
        steps: [],
      } as any;
      return {
        message: this.i18nService.t('practitioners.success.applicationStatusFetched', input.locale),
        application: {
          ...(this.practitionerApplicationMapper.toViewModel({
            id: latestApplication.id,
            status: latestApplication.status,
            submittedAt: latestApplication.submittedAt,
            reviewedAt: latestApplication.reviewedAt,
            reviewedByUserId: latestApplication.reviewedByUserId ?? null,
            reviewDecisionReason: latestApplication.reviewDecisionReason ?? null,
            reviewNotes: latestApplication.reviewNotes ?? null,
            submissionSnapshot: snapshot,
            completion,
            reviewCase: reviewCase as any,
          })),
          isProfileCompleted: missing.length === 0,
          canSubmitApplication: completion.canSubmit,
          missingRequirements: missing,
        },
      };
    }

    const [readiness, latestApplication, reviewCase] = await Promise.all([
      this.getPractitionerProfileReadinessUseCase.evaluate({
        userId: input.userId,
        currentUser: input.currentUser,
      }),
      this.practitionerApplicationRepository.findLatestByPractitionerId(
        profile.id,
      ),
      this.practitionerReviewCaseService.findActiveChangeCase(profile.id),
    ]);

    const eligibility = this.practitionerApplicationEligibilityPolicy.evaluate({
      readiness,
      latestApplicationStatus: latestApplication?.status ?? null,
    });

    return {
      message: this.i18nService.t(
        'practitioners.success.applicationStatusFetched',
        input.locale,
      ),
      application: {
        ...(latestApplication
          ? this.practitionerApplicationMapper.toViewModel({
              id: latestApplication.id,
              status: latestApplication.status,
              submittedAt: latestApplication.submittedAt,
              reviewedAt: latestApplication.reviewedAt,
              reviewedByUserId: latestApplication.reviewedByUserId ?? null,
              reviewDecisionReason:
                latestApplication.reviewDecisionReason ?? null,
              reviewNotes: latestApplication.reviewNotes ?? null,
              submissionSnapshot:
                (latestApplication.submissionSnapshot as Record<
                  string,
                  unknown
                > | null) ?? null,
              completion: readiness.completion,
              reviewCase,
            })
          : this.practitionerApplicationMapper.empty()),
        isProfileCompleted: readiness.isProfileCompleted,
        canSubmitApplication: eligibility.canSubmit,
        missingRequirements: readiness.missingRequirements,
      },
    };
  }
}
