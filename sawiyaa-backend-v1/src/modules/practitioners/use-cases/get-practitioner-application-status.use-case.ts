import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerApplicationMapper } from '../mappers/practitioner-application.mapper';
import { PractitionerApplicationEligibilityPolicy } from '../policies/practitioner-application-eligibility.policy';
import { PractitionerApplicationRepository } from '../repositories/practitioner-application.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { GetPractitionerProfileReadinessUseCase } from './get-practitioner-profile-readiness.use-case';

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
      throw new NotFoundException({
        messageKey: 'practitioners.errors.profileNotFound',
        error: 'PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    const [readiness, latestApplication] = await Promise.all([
      this.getPractitionerProfileReadinessUseCase.evaluate({
        userId: input.userId,
        currentUser: input.currentUser,
      }),
      this.practitionerApplicationRepository.findLatestByPractitionerId(
        profile.id,
      ),
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
            })
          : this.practitionerApplicationMapper.empty()),
        isProfileCompleted: readiness.isProfileCompleted,
        canSubmitApplication: eligibility.canSubmit,
        missingRequirements: readiness.missingRequirements,
      },
    };
  }
}
